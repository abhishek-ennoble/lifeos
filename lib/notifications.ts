import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Entry } from '@/types/entry';
import { DOMAINS } from '@/constants/domains';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
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

export async function scheduleEntryReminders(entry: Entry): Promise<void> {
  if (entry.domain !== DOMAINS.HEALTH) {
    return;
  }

  try {
    await cancelEntryReminders(entry.id);

    const metadata = entry.metadata as { times?: string[] } | null;
    const times = metadata?.times ?? [];

    for (const time of times) {
      const [hours, minutes] = time.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: entry.title,
          body: entry.description ?? 'Health reminder',
          data: { entryId: entry.id, domain: entry.domain },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  } catch {
    // Notification scheduling failures should not block entry creation
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

/** Parse "HH:MM" 24h into {hour, minute}, falling back to a sensible default. */
function parseTime(time: string, fallbackHour: number): { hour: number; minute: number } {
  const [h, m] = time.split(':').map((part) => Number.parseInt(part, 10));
  const hour = Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : fallbackHour;
  const minute = Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
  return { hour, minute };
}

const RITUAL_MORNING = 'ritual-morning';
const RITUAL_EVENING = 'ritual-evening';

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
      },
    });
  } catch {
    // Reflection notification is best-effort
  }
}

export async function cancelEveningReflection(): Promise<void> {
  await cancelByRitual(RITUAL_EVENING);
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
}): Promise<void> {
  if (!opts.notificationsEnabled) {
    await cancelByRitual(RITUAL_MORNING);
    await cancelByRitual(RITUAL_EVENING);
    return;
  }

  await scheduleMorningBriefingNotification(opts.morningTime);

  if (opts.eveningEnabled) {
    await scheduleEveningReflection(opts.eveningTime);
  } else {
    await cancelByRitual(RITUAL_EVENING);
  }
}
