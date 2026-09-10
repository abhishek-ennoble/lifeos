import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DOMAINS } from '@/constants/domains';
import {
  getReminderHorizon,
  mergeReminderState,
  readReminderState,
  shouldScheduleSameDayFollowUp,
} from '@/lib/reminder-accountability';
import {
  dailySpecsFromPlan,
  nextDailyFireAt,
  onceSpecsFromPlan,
  planRemindersForEntry,
} from '@/lib/reminder-plan';
import type { Entry } from '@/types/entry';
import type { Json } from '@/lib/database.types';

export const REMINDER_CATEGORY = 'reminder';
export const REMINDER_ACTION_DONE = 'reminder_done';
export const REMINDER_ACTION_SNOOZE = 'reminder_snooze';
export const RITUAL_EOD_REMINDER_REVIEW = 'ritual-eod-reminder-review';

const FOLLOW_UP_HOURS = 4;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_CHANNEL_ID = 'reminders';
const RITUAL_CHANNEL_ID = 'rituals';

/** Android channel id for a schedulable trigger; undefined on other platforms. */
function channelFor(id: string): string | undefined {
  return Platform.OS === 'android' ? id : undefined;
}

export async function ensureReminderNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    // Reminders: things the user asked to be told about — sound + heads-up.
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });

    // Rituals (briefing, reflection, nudges): silent, sit in the shade —
    // supportive, never interrupting.
    await Notifications.setNotificationChannelAsync(RITUAL_CHANNEL_ID, {
      name: 'Daily rituals',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    });
  } catch {
    // Channel setup is best-effort
  }
}

/** Register Done / Snooze action buttons on reminder notifications. */
export async function ensureReminderNotificationCategories(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
      {
        identifier: REMINDER_ACTION_DONE,
        buttonTitle: 'Done',
        options: { opensAppToForeground: true },
      },
      {
        identifier: REMINDER_ACTION_SNOOZE,
        buttonTitle: 'Snooze',
        options: { opensAppToForeground: true },
      },
    ]);
  } catch {
    // Category registration is best-effort
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await ensureReminderNotificationChannel();
    await ensureReminderNotificationCategories();

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

function reminderBody(entry: Entry): string {
  if (entry.description) {
    return entry.description;
  }
  if (entry.domain === DOMAINS.HEALTH) {
    return 'Health reminder';
  }
  return 'Reminder';
}

export async function scheduleEntryReminders(entry: Entry): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await cancelEntryReminders(entry.id);

    const plan = planRemindersForEntry(entry);
    if (plan.length === 0) {
      return;
    }

    const horizon = getReminderHorizon(entry);

    const content = {
      title: entry.title,
      body: reminderBody(entry),
      data: { entryId: entry.id, domain: entry.domain, horizon },
      categoryIdentifier: REMINDER_CATEGORY,
    };

    for (const spec of dailySpecsFromPlan(plan)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          data: { ...content.data, horizon: 'daily' as const },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: spec.hour,
          minute: spec.minute,
          channelId: channelFor(REMINDER_CHANNEL_ID),
        },
      });
    }

    const now = Date.now();
    for (const spec of onceSpecsFromPlan(plan)) {
      const msUntil = spec.fireAt.getTime() - now;
      if (msUntil <= 0) {
        continue;
      }

      // Relative short-fuse reminders use interval; longer use absolute DATE.
      if (msUntil <= 24 * 60 * 60 * 1000) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.ceil(msUntil / 1000)),
            repeats: false,
            channelId: channelFor(REMINDER_CHANNEL_ID),
          },
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: spec.fireAt,
            channelId: channelFor(REMINDER_CHANNEL_ID),
          },
        });
      }
    }
  } catch {
    // Notification scheduling failures should not block entry creation
  }
}

/** Optional +4h follow-up for same-day / multi-day reminders (1.2f). */
export async function scheduleReminderFollowUp(entry: Entry): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const horizon = getReminderHorizon(entry);
    if (!shouldScheduleSameDayFollowUp(horizon)) {
      return;
    }

    const state = readReminderState(entry);
    if (state.follow_up_scheduled) {
      return;
    }

    const content = {
      title: entry.title,
      body: 'Still on your list for today',
      data: { entryId: entry.id, domain: entry.domain, horizon, isFollowUp: true },
      categoryIdentifier: REMINDER_CATEGORY,
    };

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: FOLLOW_UP_HOURS * 60 * 60,
        repeats: false,
        channelId: channelFor(REMINDER_CHANNEL_ID),
      },
    });

    const metadata = mergeReminderState(entry, { follow_up_scheduled: true });
    const { supabase } = await import('@/lib/supabase');
    await supabase
      .from('entries')
      .update({ metadata: metadata as Json, updated_at: new Date().toISOString() })
      .eq('id', entry.id);
  } catch {
    // Follow-up scheduling is best-effort
  }
}

export async function cancelEntryReminders(entryId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = notification.content.data as { entryId?: string } | undefined;
      if (data?.entryId === entryId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch {
    // Ignore cancellation errors
  }
}

/** Build reminder rows for the Supabase `reminders` table from an entry plan. */
export function buildReminderRows(
  entry: Entry,
  userId: string,
): Array<{ user_id: string; entry_id: string; fire_at: string }> {
  const plan = planRemindersForEntry(entry);
  const rows: Array<{ user_id: string; entry_id: string; fire_at: string }> = [];

  for (const spec of dailySpecsFromPlan(plan)) {
    rows.push({
      user_id: userId,
      entry_id: entry.id,
      fire_at: nextDailyFireAt(spec.hour, spec.minute).toISOString(),
    });
  }

  for (const spec of onceSpecsFromPlan(plan)) {
    rows.push({
      user_id: userId,
      entry_id: entry.id,
      fire_at: spec.fireAt.toISOString(),
    });
  }

  return rows;
}

/** Parse "HH:MM" 24h into {hour, minute}, falling back to a sensible default. */
function parseTime(time: string, fallbackHour: number): { hour: number; minute: number } {
  const [h, m] = time.split(':').map((part) => Number.parseInt(part, 10));
  const hour = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : fallbackHour;
  const minute = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
  return { hour, minute };
}

const RITUAL_MORNING = 'ritual-morning';
const RITUAL_EVENING = 'ritual-evening';
const RITUAL_FEEDBACK = 'ritual-feedback';

const FEEDBACK_NUDGE_WEEKS_AHEAD = 8;

async function cancelByRitual(ritual: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = notification.content.data as { ritual?: string } | undefined;
      if (data?.ritual === ritual) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch {
    // Ignore cancellation errors
  }
}

/**
 * Schedule the daily morning briefing nudge at a user-configurable time. The
 * notification teases one line; richness lives in-app (DESIGN_SYSTEM §7).
 */
export async function scheduleMorningBriefingNotification(time: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }
    await cancelByRitual(RITUAL_MORNING);
    const { hour, minute } = parseTime(time, 7);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Good morning',
        body: 'A few things are worth your attention today.',
        data: { type: 'briefing', ritual: RITUAL_MORNING },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: channelFor(RITUAL_CHANNEL_ID),
      },
    });
  } catch {
    // Briefing notification is best-effort
  }
}

/** Schedule the optional, gentle evening reflection nudge. */
export async function scheduleEveningReflection(time: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }
    await cancelByRitual(RITUAL_EVENING);
    const { hour, minute } = parseTime(time, 21);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'A moment to reflect',
        body: 'Two minutes, if you have them. No pressure.',
        data: { type: 'reflection', ritual: RITUAL_EVENING },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: channelFor(RITUAL_CHANNEL_ID),
      },
    });
  } catch {
    // Reflection notification is best-effort
  }
}

export async function cancelEveningReflection(): Promise<void> {
  await cancelByRitual(RITUAL_EVENING);
}

/** Next Sunday at the given local time (or today if still upcoming). */
function nextSundayAt(hour: number, minute: number): Date {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  const day = target.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;

  if (day !== 0 || target <= now) {
    target.setDate(target.getDate() + (day === 0 ? 7 : daysUntilSunday));
  }

  return target;
}

/** Schedule Sunday 6pm feedback nudges for the next several weeks. */
export async function scheduleFeedbackWeeklyNudge(enabled: boolean): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    await cancelByRitual(RITUAL_FEEDBACK);
    if (!enabled) {
      return;
    }

    const first = nextSundayAt(18, 0);
    for (let week = 0; week < FEEDBACK_NUDGE_WEEKS_AHEAD; week++) {
      const fireAt = new Date(first);
      fireAt.setDate(first.getDate() + week * 7);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'How is LifeOS working for you?',
          body: 'Tap to leave quick app feedback — even one sentence helps.',
          data: { type: 'feedback', ritual: RITUAL_FEEDBACK },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: channelFor(RITUAL_CHANNEL_ID),
        },
      });
    }
  } catch {
    // Feedback nudge is best-effort
  }
}

/** Gentle end-of-day reminder review nudge (1.2f). */
export async function scheduleEodReminderReview(time: string, enabled: boolean): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    await cancelByRitual(RITUAL_EOD_REMINDER_REVIEW);
    if (!enabled) {
      return;
    }

    const { hour, minute } = parseTime(time, 21);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quick reminder review',
        body: 'Tap to see how today\'s reminders went — no pressure.',
        data: { type: 'reminder_review', ritual: RITUAL_EOD_REMINDER_REVIEW },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: channelFor(RITUAL_CHANNEL_ID),
      },
    });
  } catch {
    // EOD review nudge is best-effort
  }
}

/**
 * Reconcile scheduled ritual notifications with the user's settings. Called
 * after settings change so toggles/time edits take effect immediately.
 */
export async function applyRitualSchedule(opts: {
  notificationsEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  feedbackWeeklyNudge: boolean;
  reminderEodReviewEnabled: boolean;
}): Promise<void> {
  if (!opts.notificationsEnabled) {
    await cancelByRitual(RITUAL_MORNING);
    await cancelByRitual(RITUAL_EVENING);
    await cancelByRitual(RITUAL_FEEDBACK);
    await cancelByRitual(RITUAL_EOD_REMINDER_REVIEW);
    return;
  }

  await scheduleMorningBriefingNotification(opts.morningTime);

  if (opts.eveningEnabled) {
    await scheduleEveningReflection(opts.eveningTime);
  } else {
    await cancelByRitual(RITUAL_EVENING);
  }

  await scheduleFeedbackWeeklyNudge(opts.feedbackWeeklyNudge);
  await scheduleEodReminderReview(opts.eveningTime, opts.reminderEodReviewEnabled);
}
