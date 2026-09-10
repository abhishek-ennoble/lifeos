import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useSettings } from '@/hooks/useSettings';
import { reconcileFiredReminders } from '@/lib/reminder-sync';
import {
  applyRitualSchedule,
  ensureReminderNotificationCategories,
  ensureReminderNotificationChannel,
  REMINDER_ACTION_DONE,
  REMINDER_ACTION_SNOOZE,
} from '@/lib/notifications';
import {
  markReminderDone,
  onReminderFired,
  snoozeReminderEntry,
} from '@/lib/reminder-actions';

function entryIdFromResponse(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as { entryId?: unknown } | undefined;
  return typeof data?.entryId === 'string' ? data.entryId : null;
}

function notificationType(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as { type?: unknown } | undefined;
  return typeof data?.type === 'string' ? data.type : null;
}

function entryIdFromNotification(notification: Notifications.Notification): string | null {
  const data = notification.request.content.data as { entryId?: unknown } | undefined;
  return typeof data?.entryId === 'string' ? data.entryId : null;
}

export function NotificationRouter() {
  const router = useRouter();
  const handledColdStart = useRef(false);
  const { settings, loading: settingsLoading } = useSettings();
  const ritualsApplied = useRef(false);

  // Re-apply ritual schedules once per launch so toggles survive device
  // restarts, reinstalls, and OS notification cleanup.
  useEffect(() => {
    if (settingsLoading || ritualsApplied.current) {
      return;
    }
    ritualsApplied.current = true;
    void applyRitualSchedule({
      notificationsEnabled: settings.notificationsEnabled,
      morningTime: settings.morningTime,
      eveningEnabled: settings.eveningEnabled,
      eveningTime: settings.eveningTime,
      feedbackWeeklyNudge: settings.feedbackWeeklyNudge,
      reminderEodReviewEnabled: settings.reminderEodReviewEnabled,
    });
  }, [settings, settingsLoading]);

  // D2: reminders delivered while backgrounded never reach the "received"
  // listener, so reconcile telemetry on launch and each return to foreground.
  useEffect(() => {
    void reconcileFiredReminders();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void reconcileFiredReminders();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void ensureReminderNotificationChannel();
    void ensureReminderNotificationCategories();

    const openEntry = (entryId: string) => {
      router.push({
        pathname: '/(tabs)/inbox',
        params: { highlightEntryId: entryId },
      });
    };

    const openFeedbackCapture = () => {
      router.push({
        pathname: '/settings',
        params: { giveFeedback: '1' },
      });
    };

    const openReminderReview = () => {
      router.push('/reminder-review' as Href);
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const entryId = entryIdFromResponse(response);
      const action = response.actionIdentifier;

      if (entryId && action === REMINDER_ACTION_DONE) {
        void markReminderDone(entryId);
        return;
      }

      if (entryId && action === REMINDER_ACTION_SNOOZE) {
        void snoozeReminderEntry(entryId);
        return;
      }

      if (entryId) {
        openEntry(entryId);
        return;
      }

      const type = notificationType(response);
      if (type === 'feedback') {
        openFeedbackCapture();
        return;
      }
      if (type === 'reminder_review') {
        openReminderReview();
      }
    };

    if (!handledColdStart.current) {
      handledColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then((last) => {
        if (last) {
          handleResponse(last);
        }
      });
    }

    const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const entryId = entryIdFromNotification(notification);
      if (entryId) {
        void onReminderFired(entryId);
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [router]);

  return null;
}
