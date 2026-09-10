import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { BrainDumpModal, CaptureInput } from '@/components/CaptureInput';
import { MorningBriefing } from '@/components/MorningBriefing';
import { VoiceInput } from '@/components/VoiceInput';
import { DOMAIN_LABELS } from '@/constants/domains';
import { useAntiEntropy } from '@/hooks/useChat';
import { useBriefing } from '@/hooks/useBriefing';
import { useEntries } from '@/hooks/useEntries';
import { useFeedback } from '@/hooks/useFeedback';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { showCaptureSuccessToast } from '@/lib/capture-toast';
import { countPendingFollowUps } from '@/lib/follow-ups';
import {
  selectRecentCaptures,
  selectToday,
  startOfLocalDay,
  todayMeta,
} from '@/lib/entry-utils';
import { greetingForHour } from '@/lib/greeting';
import { requestNotificationPermissions } from '@/lib/notifications';

const ONBOARDING_EXAMPLES = [
  'Buy milk tomorrow',
  'Idea: a weekend side project',
  'Practice guitar daily at 7pm',
];

export default function HomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, captureText, updateEntryStatus } = useEntries();
  const { settings } = useSettings();
  const { newCount: newFeedbackCount } = useFeedback(settings.feedbackLastSeenAt);
  const { briefing, loading: briefingLoading, generateBriefing } = useBriefing();
  const { staleCount } = useAntiEntropy();
  const { profile } = useProfile();
  const [brainDumpVisible, setBrainDumpVisible] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(true);

  const today = useMemo(() => selectToday(entries, 3), [entries]);
  const followUpCount = useMemo(() => countPendingFollowUps(entries), [entries]);
  const recentCaptures = useMemo(() => {
    const shownOnToday = new Set(today.map((entry) => entry.id));
    return selectRecentCaptures(entries, 3, { exclude: shownOnToday, since: startOfLocalDay() });
  }, [entries, today]);

  // F21: the "Notifications" action is only useful until permission is granted.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    let active = true;
    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        if (active) {
          setNotificationsGranted(status === 'granted');
        }
      })
      .catch(() => {
        if (active) {
          setNotificationsGranted(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const setupNotifications = async () => {
    const granted = await requestNotificationPermissions();
    setNotificationsGranted(granted);
    Toast.show({
      type: granted ? 'success' : 'error',
      text1: granted ? 'Notifications enabled' : 'Permission denied',
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: 140 },
        ]}>
        <View style={styles.topRow}>
          <Text
            style={[typography.display, styles.greeting, { color: colors.textPrimary }]}
            numberOfLines={1}>
            {greetingForHour(new Date().getHours(), profile.displayName)}
          </Text>
          <Link href="/settings" asChild>
            <Pressable hitSlop={12} accessibilityLabel="Settings" style={styles.settingsButton}>
              <SymbolView
                name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                size={22}
                tintColor={colors.textSecondary}
              />
              {newFeedbackCount > 0 ? (
                <View style={[styles.settingsBadge, { backgroundColor: colors.accentWarm }]}>
                  <Text style={[styles.settingsBadgeText, { color: colors.primaryContrast }]}>
                    {newFeedbackCount > 9 ? '9+' : newFeedbackCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </Link>
        </View>

        {/* F21: capture is the first thing under the greeting — always above the fold. */}
        <View style={styles.captureSection}>
          <CaptureInput onSubmit={captureText} />
        </View>

        <View style={styles.briefingSection}>
          <MorningBriefing
            briefing={briefing}
            loading={briefingLoading}
            onGenerate={() => void generateBriefing()}
          />
        </View>

        {recentCaptures.length > 0 ? (
          <View style={styles.section}>
            <Text style={[typography.title, styles.sectionTitle, { color: colors.textPrimary }]}>
              Just captured
            </Text>
            {recentCaptures.map((entry) => (
              <Pressable
                key={entry.id}
                style={styles.todayRow}
                onPress={() =>
                  router.push({
                    pathname: '/inbox',
                    params: { highlightEntryId: entry.id },
                  })
                }>
                <View style={[styles.dot, { backgroundColor: colors.domain[entry.domain] }]} />
                <View style={styles.recentText}>
                  <Text style={[styles.todayTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text style={[styles.recentDomain, { color: colors.textSecondary }]}>
                    {DOMAIN_LABELS[entry.domain]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {followUpCount > 0 ? (
          <Link href={'/follow-ups' as Href} asChild>
            <Pressable style={[styles.staleBanner, { borderColor: colors.border }]}>
              <Text style={[styles.staleText, { color: colors.textSecondary }]}>
                {followUpCount} {followUpCount === 1 ? 'question' : 'questions'} waiting to sharpen
                what you captured — answer when you have a minute
              </Text>
            </Pressable>
          </Link>
        ) : null}

        {staleCount > 0 ? (
          <Link href="/anti-entropy" asChild>
            <Pressable style={[styles.staleBanner, { borderColor: colors.border }]}>
              <Text style={[styles.staleText, { color: colors.textSecondary }]}>
                {staleCount} {staleCount === 1 ? 'thing has' : 'things have'} been still for a
                while — review when you&apos;re ready
              </Text>
            </Pressable>
          </Link>
        ) : null}

        <View style={styles.section}>
          <Text style={[typography.title, styles.sectionTitle, { color: colors.textPrimary }]}>
            Today
          </Text>
          {today.length === 0 && entries.length === 0 ? (
            <View>
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Welcome. Capture anything — a task, an idea, a reminder — and I&apos;ll sort it for
                you. Try one:
              </Text>
              <View style={styles.exampleRow}>
                {ONBOARDING_EXAMPLES.map((example) => (
                  <Pressable
                    key={example}
                    style={[styles.exampleChip, { borderColor: colors.border }]}
                    onPress={async () => {
                      const result = await captureText(example);
                      showCaptureSuccessToast(result);
                    }}>
                    <Text style={[styles.exampleText, { color: colors.textPrimary }]}>
                      {example}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : today.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Nothing pressing. Enjoy the space.
            </Text>
          ) : (
            today.map((entry) => {
              const meta = todayMeta(entry);
              return (
                <Pressable
                  key={entry.id}
                  style={styles.todayRow}
                  onPress={() => void updateEntryStatus(entry.id, 'done')}>
                  <View style={[styles.dot, { backgroundColor: colors.domain[entry.domain] }]} />
                  <Text style={[styles.todayTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  {meta ? (
                    <Text style={[styles.todayMeta, { color: colors.textSecondary }]}>{meta}</Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
          <Link href="/inbox" asChild>
            <Pressable hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all in Inbox →</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.secondaryRow}>
          <SecondaryAction
            label="Brain dump"
            onPress={() => setBrainDumpVisible(true)}
            color={colors.textSecondary}
          />
          <SecondaryAction
            label="Journal"
            onPress={() => router.push('/journal')}
            color={colors.textSecondary}
          />
          <SecondaryAction
            label="Ask AI"
            onPress={() => router.push('/chat')}
            color={colors.textSecondary}
          />
          {notificationsGranted ? null : (
            <SecondaryAction
              label="Notifications"
              onPress={() => void setupNotifications()}
              color={colors.textSecondary}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.fabBar, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <VoiceInput variant="fab" onTranscribed={captureText} />
      </View>

      <BrainDumpModal
        visible={brainDumpVisible}
        onClose={() => setBrainDumpVisible(false)}
        onSubmit={captureText}
      />
    </View>
  );
}

function SecondaryAction({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable hitSlop={8} onPress={onPress} style={styles.secondaryAction}>
      <Text style={[styles.secondaryText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  greeting: {
    flex: 1,
  },
  briefingSection: {
    marginTop: 20,
  },
  settingsButton: {
    position: 'relative',
  },
  settingsBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  settingsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  staleBanner: {
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
  },
  staleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  todayTitle: {
    flex: 1,
    fontSize: 16,
  },
  recentText: {
    flex: 1,
    gap: 2,
  },
  recentDomain: {
    fontSize: 12,
    fontWeight: '500',
  },
  todayMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  exampleChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exampleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  captureSection: {
    marginTop: 12,
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 32,
  },
  secondaryAction: {
    paddingVertical: 4,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fabBar: {
    position: 'absolute',
    right: 24,
    alignItems: 'center',
    gap: 8,
  },
});
