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
