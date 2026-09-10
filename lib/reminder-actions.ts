import Toast from 'react-native-toast-message';

import { DOMAINS } from '@/constants/domains';
import {
  getReminderHorizon,
  maxSnoozesForHorizon,
  mergeReminderState,
  readReminderState,
  snoozeMinutesForHorizon,
} from '@/lib/reminder-accountability';
import {
  cancelEntryReminders,
  scheduleEntryReminders,
  scheduleReminderFollowUp,
} from '@/lib/notifications';
import { clearReminderFire, logReminderFire } from '@/lib/reminder-fire-log';
import { markReminderAcknowledged, markReminderSent } from '@/lib/reminder-sync';
import { supabase } from '@/lib/supabase';
import { upsertCachedEntry } from '@/lib/sqlite';
import type { Entry, EntryMetadata } from '@/types/entry';
import type { Json } from '@/lib/database.types';

function mapRow(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    raw_input: (row.raw_input as string | null) ?? null,
    domain: row.domain as Entry['domain'],
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

async function fetchEntry(entryId: string): Promise<Entry | null> {
  const { data, error } = await supabase.from('entries').select('*').eq('id', entryId).maybeSingle();
  if (error || !data) {
    return null;
  }
  return mapRow(data as Record<string, unknown>);
}

async function persistEntry(entry: Entry): Promise<void> {
  await upsertCachedEntry(entry);
}

export async function onReminderFired(entryId: string): Promise<void> {
  await logReminderFire(entryId);
  void markReminderSent(entryId);
  const entry = await fetchEntry(entryId);
  if (!entry) {
    return;
  }

  const state = readReminderState(entry);
  if (!state.follow_up_scheduled) {
    await scheduleReminderFollowUp(entry);
  }
}

export async function markReminderDone(entryId: string): Promise<boolean> {
  try {
    const entry = await fetchEntry(entryId);
    if (!entry) {
      return false;
    }

    const metadata = mergeReminderState(entry, { last_ack: 'done' });
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('entries')
      .update({
        status: 'done',
        metadata: metadata as Json,
        updated_at: now,
      })
      .eq('id', entryId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    await cancelEntryReminders(entryId);
    await clearReminderFire(entryId);
    await persistEntry(mapRow(data as Record<string, unknown>));
    void markReminderAcknowledged(entryId);

    Toast.show({ type: 'success', text1: 'Done', text2: entry.title });
    return true;
  } catch {
    Toast.show({ type: 'error', text1: 'Could not mark done' });
    return false;
  }
}

export async function snoozeReminderEntry(
  entryId: string,
  minutesOverride?: number,
): Promise<boolean> {
  try {
    const entry = await fetchEntry(entryId);
    if (!entry) {
      return false;
    }

    const horizon = getReminderHorizon(entry);
    const maxSnoozes = maxSnoozesForHorizon(horizon);
    const state = readReminderState(entry);
    const snoozeCount = state.snooze_count ?? 0;

    if (maxSnoozes === 0) {
      Toast.show({
        type: 'info',
        text1: 'Cannot snooze',
        text2: 'Daily health reminders use Done or Open only',
      });
      return false;
    }

    if (snoozeCount >= maxSnoozes) {
      Toast.show({
        type: 'info',
        text1: 'Snooze limit reached',
        text2: 'Open the entry to review or mark done',
      });
      return false;
    }

    const minutes = minutesOverride ?? snoozeMinutesForHorizon(horizon);
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

    const baseMeta = { ...((entry.metadata ?? {}) as Record<string, unknown>) };
    delete baseMeta.reminder_in_minutes;
    baseMeta.remind_at = snoozeUntil.toISOString();

    const metadata = {
      ...baseMeta,
      reminder_state: {
        ...state,
        snooze_count: snoozeCount + 1,
        last_ack: 'snoozed' as const,
        follow_up_scheduled: false,
      },
    };

    const { data, error } = await supabase
      .from('entries')
      .update({
        metadata: metadata as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const updated = mapRow(data as Record<string, unknown>);
    await cancelEntryReminders(entryId);
    await scheduleEntryReminders(updated);
    await persistEntry(updated);
    void markReminderAcknowledged(entryId);

    Toast.show({
      type: 'success',
      text1: 'Snoozed',
      text2: `Reminder in ${minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes}m`}`,
    });
    return true;
  } catch {
    Toast.show({ type: 'error', text1: 'Could not snooze' });
    return false;
  }
}

export async function snoozeReminderUntilTomorrow(entryId: string): Promise<boolean> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const minutes = Math.max(1, Math.round((tomorrow.getTime() - Date.now()) / 60_000));
  return snoozeReminderEntry(entryId, minutes);
}

export async function markReminderBlocked(entryId: string, note: string): Promise<boolean> {
  try {
    const entry = await fetchEntry(entryId);
    if (!entry) {
      return false;
    }

    const metadata = mergeReminderState(entry, {
      last_ack: 'blocked',
      blocked_note: note.trim() || undefined,
    });

    const { data, error } = await supabase
      .from('entries')
      .update({
        metadata: metadata as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    await persistEntry(mapRow(data as Record<string, unknown>));
    return true;
  } catch {
    Toast.show({ type: 'error', text1: 'Could not save note' });
    return false;
  }
}

export async function createLinkedFollowUpTask(parent: Entry, note: string): Promise<boolean> {
  try {
    const title = `Follow-up: ${parent.title}`.slice(0, 80);
    const description = note.trim() || `Blocked on: ${parent.title}`;

    const { error } = await supabase.from('entries').insert({
      user_id: parent.user_id,
      raw_input: description,
      domain: DOMAINS.TASK,
      title,
      description,
      metadata: {
        subdomain: 'personal',
        ephemeral: false,
        linked_entry_id: parent.id,
      } as Json,
      priority: parent.priority,
      status: 'pending',
      is_recurring: false,
      recurrence_rule: null,
      due_at: null,
      expires_at: null,
    });

    if (error) {
      throw error;
    }

    Toast.show({ type: 'success', text1: 'Follow-up task added' });
    return true;
  } catch {
    Toast.show({ type: 'error', text1: 'Could not create follow-up task' });
    return false;
  }
}
