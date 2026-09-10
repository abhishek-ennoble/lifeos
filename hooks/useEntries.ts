import { useCallback, useEffect, useState } from 'react';

import { DOMAINS, type Domain, type LifeArea } from '@/constants/domains';
import { invokeFunction, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { cacheEntries, readCachedEntries, upsertCachedEntry } from '@/lib/sqlite';
import { temporalContext } from '@/lib/temporal-context';
import {
  buildReminderRows,
  cancelEntryReminders,
  requestNotificationPermissions,
  scheduleEntryReminders,
} from '@/lib/notifications';
import { planRemindersForEntry } from '@/lib/reminder-plan';
import type { CaptureResult } from '@/types/capture';
import type { ClassifiedEntry, ClassifyResponse, Entry, EntryMetadata, JournalMetadata } from '@/types/entry';
import type { Json } from '@/lib/database.types';

export interface JournalInput {
  text: string;
  lifeArea?: LifeArea;
  mood?: string;
  highlight?: string;
  gratitude?: string;
  tomorrowAnchor?: string;
}

interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  captureText: (rawInput: string) => Promise<CaptureResult | null>;
  captureJournal: (input: JournalInput) => Promise<Entry | null>;
  updateEntryStatus: (id: string, status: Entry['status']) => Promise<void>;
  /** Replace an entry's metadata (used for follow-up answers, tags). */
  updateEntryMetadata: (id: string, metadata: EntryMetadata) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  logLearningSession: (id: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => Promise<void>;
}

function deriveJournalTitle(text: string): string {
  const firstLine = text.trim().split('\n')[0]?.trim() ?? '';
  if (!firstLine) {
    return 'Journal entry';
  }
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

function mapRow(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    raw_input: (row.raw_input as string | null) ?? null,
    domain: row.domain as Domain,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    metadata: (row.metadata as EntryMetadata | null) ?? null,
    priority: row.priority as Entry['priority'],
    status: row.status as Entry['status'],
    is_recurring: Boolean(row.is_recurring),
    recurrence_rule: (row.recurrence_rule as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    last_reviewed_at: (row.last_reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useEntries(domain?: Domain): UseEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = await readCachedEntries(domain);
      if (cached.length > 0) {
        setEntries(cached);
      }

      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('entries')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (domain) {
        query = query.eq('domain', domain);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const mapped = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
      setEntries(mapped);
      await cacheEntries(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load entries';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const insertClassifiedEntry = useCallback(
    async (classified: ClassifiedEntry, rawInput: string, userId: string): Promise<Entry> => {
      const metadataWithLifeArea: EntryMetadata | null = classified.life_area
        ? ({ ...(classified.metadata ?? {}), life_area: classified.life_area } as EntryMetadata)
        : classified.metadata;

      const insertPayload = {
        user_id: userId,
        raw_input: rawInput,
        domain: classified.domain,
        title: classified.title,
        description: classified.description,
        metadata: metadataWithLifeArea as Json | null,
        priority: classified.priority,
        status: 'pending' as const,
        is_recurring: classified.is_recurring,
        recurrence_rule: classified.recurrence_rule,
        due_at: classified.due_at,
        expires_at: classified.expires_at,
      };

      const { data, error: insertError } = await supabase
        .from('entries')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      const entry = mapRow(data as Record<string, unknown>);
      await upsertCachedEntry(entry);

      const reminderPlan = planRemindersForEntry(entry);
      if (reminderPlan.length > 0) {
        await requestNotificationPermissions();
        const rows = buildReminderRows(entry, userId);
        if (rows.length > 0) {
          await supabase.from('reminders').insert(rows);
        }
        await scheduleEntryReminders(entry);
      }

      return entry;
    },
    [],
  );

  const captureText = useCallback(
    async (rawInput: string): Promise<CaptureResult | null> => {
      try {
        const response = await invokeFunction<ClassifyResponse>('classify-entry', {
          raw_input: rawInput,
          ...temporalContext(),
        });

        const items = response.items ?? [];
        if (items.length === 0) {
          throw new Error('Nothing to capture');
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Not authenticated');
        }

        const feedbackItems = items.filter((item) => item.domain === 'feedback');
        const entryItems = items.filter((item) => item.domain !== 'feedback');

        for (const classified of feedbackItems) {
          const theme =
            classified.metadata && typeof classified.metadata === 'object'
              ? String((classified.metadata as Record<string, unknown>).theme ?? '') || null
              : null;

          const { error: feedbackError } = await supabase.from('app_feedback').insert({
            user_id: user.id,
            title: classified.title,
            body: classified.description ?? rawInput,
            theme,
            source: 'capture',
            status: 'new',
          });

          if (feedbackError) {
            throw feedbackError;
          }
        }

        if (entryItems.length === 0) {
          return { kind: 'feedback' };
        }

        const saved: Entry[] = [];
        for (const classified of entryItems) {
          const entry = await insertClassifiedEntry(classified, rawInput, user.id);
          saved.push(entry);
        }

        await refresh();

        if (saved.length === 1) {
          return { kind: 'entry', entry: saved[0] };
        }

        return { kind: 'entries', entries: saved, count: saved.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to capture entry';
        setError(message);
        throw new Error(message);
      }
    },
    [insertClassifiedEntry, refresh],
  );

  const captureJournal = useCallback(
    async (input: JournalInput): Promise<Entry | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Not authenticated');
        }

        const metadata: JournalMetadata = {
          ...(input.lifeArea ? { life_area: input.lifeArea } : {}),
          ...(input.mood ? { mood: input.mood } : {}),
          ...(input.highlight ? { highlight: input.highlight } : {}),
          ...(input.gratitude ? { gratitude: input.gratitude } : {}),
          ...(input.tomorrowAnchor ? { tomorrow_anchor: input.tomorrowAnchor } : {}),
        };

        // Journals are manual and reflective — no AI classification, no expiry,
        // no reminders. Inserted directly with domain='journal'.
        const insertPayload = {
          user_id: user.id,
          raw_input: input.text,
          domain: DOMAINS.JOURNAL,
          title: deriveJournalTitle(input.text),
          description: input.text,
          metadata: metadata as Json,
          priority: 'low' as const,
          status: 'done' as const,
          is_recurring: false,
          recurrence_rule: null,
          due_at: null,
          expires_at: null,
        };

        const { data, error: insertError } = await supabase
          .from('entries')
          .insert(insertPayload)
          .select('*')
          .single();

        if (insertError) {
          throw insertError;
        }

        const entry = mapRow(data as Record<string, unknown>);
        await upsertCachedEntry(entry);
        await refresh();

        if (isSupabaseConfigured) {
          void invokeFunction<{ detected?: boolean }>('scan-journal-feedback', {
            journal_text: input.text,
            entry_id: entry.id,
          }).catch(() => {
            // Journal feedback scan is best-effort
          });
        }

        return entry;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save journal';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
  );

  const updateEntryStatus = useCallback(
    async (id: string, status: Entry['status']) => {
      try {
        const { error: updateError } = await supabase
          .from('entries')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        if (status === 'done' || status === 'archived') {
          await cancelEntryReminders(id);
        }

        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update entry';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
  );

  const updateEntryMetadata = useCallback(
    async (id: string, metadata: EntryMetadata) => {
      try {
        const { data, error: updateError } = await supabase
          .from('entries')
          .update({ metadata: metadata as Json, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single();

        if (updateError) {
          throw updateError;
        }

        const updated = mapRow(data as Record<string, unknown>);
        await upsertCachedEntry(updated);
        setEntries((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update entry';
        setError(message);
        throw new Error(message);
      }
    },
    [],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase
          .from('entries')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', id);

        if (deleteError) {
          throw deleteError;
        }

        await cancelEntryReminders(id);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete entry';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
  );

  const logLearningSession = useCallback(
    async (id: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
      try {
        const entry = entries.find((item) => item.id === id);
        if (!entry) {
          throw new Error('Entry not found');
        }

        const metadata = (entry.metadata ?? {}) as {
          interval_days?: number;
        };
        const currentInterval = metadata.interval_days ?? 1;
        const { nextReviewDate } = await import('@/lib/spaced-repetition');
        const nextDate = nextReviewDate(new Date(), currentInterval, quality);
        const newInterval =
          quality >= 3 ? Math.max(1, Math.round(currentInterval * 2.5)) : 1;

        const { error: updateError } = await supabase
          .from('entries')
          .update({
            last_reviewed_at: new Date().toISOString(),
            metadata: { ...metadata, interval_days: newInterval } as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to log learning session';
        setError(message);
        throw new Error(message);
      }
    },
    [entries, refresh],
  );

  return {
    entries,
    loading,
    error,
    refresh,
    captureText,
    captureJournal,
    updateEntryStatus,
    updateEntryMetadata,
    deleteEntry,
    logLearningSession,
  };
}
