import { useCallback, useEffect, useState } from 'react';

import { DOMAINS, type Domain, type LifeArea } from '@/constants/domains';
import { invokeFunction, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { cacheEntries, readCachedEntries, upsertCachedEntry } from '@/lib/sqlite';
import { scheduleEntryReminders } from '@/lib/notifications';
import type { CaptureResult } from '@/types/capture';
import type { ClassifiedEntry, Entry, EntryMetadata, JournalMetadata } from '@/types/entry';
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

  const captureText = useCallback(
    async (rawInput: string): Promise<CaptureResult | null> => {
      try {
        const classified = await invokeFunction<ClassifiedEntry>('classify-entry', {
          raw_input: rawInput,
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Not authenticated');
        }

        if (classified.domain === 'feedback') {
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

          return { kind: 'feedback' };
        }

        // Fold the classifier's optional life-area tag into metadata so it
        // surfaces in Inbox filters without a separate column.
        const metadataWithLifeArea: EntryMetadata | null = classified.life_area
          ? ({ ...(classified.metadata ?? {}), life_area: classified.life_area } as EntryMetadata)
          : classified.metadata;

        const insertPayload = {
          user_id: user.id,
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
        await scheduleEntryReminders(entry);

        if (classified.domain === DOMAINS.HEALTH && classified.metadata) {
          const times = (classified.metadata as { times?: string[] }).times ?? [];
          if (times.length > 0) {
            const reminders = times.map((time) => {
              const [hours, minutes] = time.split(':').map(Number);
              const fireAt = new Date();
              fireAt.setHours(hours, minutes, 0, 0);
              if (fireAt <= new Date()) {
                fireAt.setDate(fireAt.getDate() + 1);
              }
              return {
                user_id: user.id,
                entry_id: entry.id,
                fire_at: fireAt.toISOString(),
              };
            });

            await supabase.from('reminders').insert(reminders);
          }
        }

        await refresh();
        return { kind: 'entry', entry };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to capture entry';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
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

        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update entry';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
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
    deleteEntry,
    logLearningSession,
  };
}
