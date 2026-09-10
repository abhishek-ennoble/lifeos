import { DOMAINS } from '@/constants/domains';
import type { Entry } from '@/types/entry';

export type ReminderHorizon = 'short' | 'same_day' | 'multi_day' | 'daily';

export type ReminderAck = 'done' | 'snoozed' | 'blocked' | 'dismissed';

export interface ReminderState {
  snooze_count?: number;
  blocked_note?: string;
  last_ack?: ReminderAck;
  /** Same-day +4h follow-up already scheduled for this fire cycle. */
  follow_up_scheduled?: boolean;
}

export function readReminderState(entry: Entry): ReminderState {
  const meta = (entry.metadata ?? {}) as { reminder_state?: ReminderState };
  return meta.reminder_state ?? {};
}

export function getReminderHorizon(entry: Entry): ReminderHorizon {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

  if (entry.domain === DOMAINS.HEALTH && Array.isArray(metadata.times) && metadata.times.length > 0) {
    return 'daily';
  }

  const reminderInMinutes = metadata.reminder_in_minutes;
  if (typeof reminderInMinutes === 'number' && reminderInMinutes > 0 && reminderInMinutes <= 60) {
    return 'short';
  }

  const targetIso =
    (typeof metadata.remind_at === 'string' ? metadata.remind_at : null) ??
    entry.due_at ??
    null;

  if (targetIso) {
    const diffMs = Date.parse(targetIso) - Date.now();
    if (diffMs > 24 * 60 * 60 * 1000) {
      return 'multi_day';
    }
    return 'same_day';
  }

  if (typeof reminderInMinutes === 'number' && reminderInMinutes > 60) {
    return 'same_day';
  }

  return 'same_day';
}

export function maxSnoozesForHorizon(horizon: ReminderHorizon): number {
  switch (horizon) {
    case 'short':
      return 1;
    case 'same_day':
      return 2;
    case 'multi_day':
      return 1;
    case 'daily':
      return 0;
  }
}

export function snoozeMinutesForHorizon(horizon: ReminderHorizon): number {
  switch (horizon) {
    case 'short':
      return 15;
    case 'same_day':
      return 60;
    case 'multi_day':
      return 24 * 60;
    case 'daily':
      return 0;
  }
}

export function shouldScheduleSameDayFollowUp(horizon: ReminderHorizon): boolean {
  return horizon === 'same_day' || horizon === 'multi_day';
}

export function mergeReminderState(
  entry: Entry,
  patch: Partial<ReminderState>,
): Record<string, unknown> {
  const metadata = { ...((entry.metadata ?? {}) as Record<string, unknown>) };
  const current = readReminderState(entry);
  metadata.reminder_state = { ...current, ...patch };
  return metadata;
}
