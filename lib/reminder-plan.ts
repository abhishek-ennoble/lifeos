import { DOMAINS } from '@/constants/domains';
import type { Entry } from '@/types/entry';

export type DailyReminderSpec = {
  kind: 'daily';
  hour: number;
  minute: number;
};

export type OnceReminderSpec = {
  kind: 'once';
  fireAt: Date;
};

export type ReminderSpec = DailyReminderSpec | OnceReminderSpec;

function parseTime24(time: string): { hour: number; minute: number } | null {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return { hour: hours, minute: minutes };
}

function addOnce(specs: OnceReminderSpec[], fireAt: Date): void {
  if (fireAt.getTime() <= Date.now()) {
    return;
  }
  const duplicate = specs.some((s) => Math.abs(s.fireAt.getTime() - fireAt.getTime()) < 60_000);
  if (!duplicate) {
    specs.push({ kind: 'once', fireAt });
  }
}

/**
 * Derive local notification + DB reminder rows from an entry.
 * Supports health daily times, relative ("in 10 min"), and absolute remind/due times.
 */
export function planRemindersForEntry(entry: Entry): ReminderSpec[] {
  const specs: ReminderSpec[] = [];
  const onceSpecs: OnceReminderSpec[] = [];
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

  const reminderInMinutes = metadata.reminder_in_minutes;
  if (typeof reminderInMinutes === 'number' && reminderInMinutes > 0) {
    const fireAt = new Date();
    fireAt.setMinutes(fireAt.getMinutes() + Math.round(reminderInMinutes));
    addOnce(onceSpecs, fireAt);
  }

  const remindAt = metadata.remind_at;
  if (typeof remindAt === 'string') {
    const parsed = new Date(remindAt);
    if (!Number.isNaN(parsed.getTime())) {
      addOnce(onceSpecs, parsed);
    }
  }

  if (metadata.wants_reminder === true && entry.due_at) {
    const parsed = new Date(entry.due_at);
    if (!Number.isNaN(parsed.getTime())) {
      addOnce(onceSpecs, parsed);
    }
  }

  if (entry.domain === DOMAINS.HEALTH) {
    const times = metadata.times;
    if (Array.isArray(times)) {
      for (const time of times) {
        if (typeof time !== 'string') {
          continue;
        }
        const parsed = parseTime24(time);
        if (parsed) {
          specs.push({ kind: 'daily', hour: parsed.hour, minute: parsed.minute });
        }
      }
    }
  }

  specs.push(...onceSpecs);
  return specs;
}

/** Next calendar fire time for a daily HH:MM slot (today or tomorrow). */
export function nextDailyFireAt(hour: number, minute: number, from = new Date()): Date {
  const fireAt = new Date(from);
  fireAt.setHours(hour, minute, 0, 0);
  if (fireAt.getTime() <= from.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }
  return fireAt;
}

export function onceSpecsFromPlan(plan: ReminderSpec[]): OnceReminderSpec[] {
  return plan.filter((spec): spec is OnceReminderSpec => spec.kind === 'once');
}

export function dailySpecsFromPlan(plan: ReminderSpec[]): DailyReminderSpec[] {
  return plan.filter((spec): spec is DailyReminderSpec => spec.kind === 'daily');
}

export function entryHasScheduledReminder(entry: Entry): boolean {
  return planRemindersForEntry(entry).length > 0;
}

function formatTime12(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'am' : 'pm';
  return minute === 0 ? `${h}${ampm}` : `${h}:${minute.toString().padStart(2, '0')}${ampm}`;
}

function formatRelativeMinutes(minutes: number): string {
  if (minutes < 60) {
    return `in ${Math.round(minutes)} min`;
  }
  const hours = Math.round(minutes / 60);
  return hours === 1 ? 'in 1 hour' : `in ${hours} hours`;
}

/** Human-readable reminder label for EntryCard badges. */
export function getEntryReminderLabel(entry: Entry): string | null {
  if (!entryHasScheduledReminder(entry)) {
    return null;
  }

  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const reminderInMinutes = metadata.reminder_in_minutes;
  if (typeof reminderInMinutes === 'number' && reminderInMinutes > 0 && entry.created_at) {
    const fireAt = new Date(entry.created_at);
    fireAt.setMinutes(fireAt.getMinutes() + Math.round(reminderInMinutes));
    const diffMin = Math.round((fireAt.getTime() - Date.now()) / 60_000);
    if (diffMin > 0 && diffMin <= 24 * 60) {
      return formatRelativeMinutes(diffMin);
    }
  }

  const remindAt = metadata.remind_at;
  if (typeof remindAt === 'string') {
    const parsed = new Date(remindAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }

  if (metadata.wants_reminder === true && entry.due_at) {
    const parsed = new Date(entry.due_at);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }

  if (entry.domain === DOMAINS.HEALTH && Array.isArray(metadata.times) && metadata.times.length > 0) {
    const first = metadata.times[0];
    if (typeof first === 'string') {
      const parsed = parseTime24(first);
      if (parsed) {
        return `daily ${formatTime12(parsed.hour, parsed.minute)}`;
      }
    }
  }

  return 'reminder set';
}
