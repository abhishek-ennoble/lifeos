import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Toast from 'react-native-toast-message';

import { FeedbackCaptureModal } from '@/components/FeedbackCaptureModal';
import { useEntries } from '@/hooks/useEntries';
import { generateFeedbackDigest, useFeedback } from '@/hooks/useFeedback';
import { formatUsd, useAiUsage } from '@/hooks/useAiUsage';
import { useProfile } from '@/hooks/useProfile';
import { useSettings, type ThemePref } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { applyRitualSchedule, requestNotificationPermissions } from '@/lib/notifications';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const { colors, typography, radius } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { captureText } = useEntries();
  const { newCount } = useFeedback(settings.feedbackLastSeenAt);
  const {
    today: aiUsageToday,
    month: aiUsageMonth,
    allTime: aiUsageAllTime,
    loading: aiUsageLoading,
    error: aiUsageError,
  } = useAiUsage();
  const router = useRouter();
  const { giveFeedback } = useLocalSearchParams<{ giveFeedback?: string }>();

  const { profile, updateDisplayName } = useProfile();
  const [nameDraft, setNameDraft] = useState('');
  const [nameDirty, setNameDirty] = useState(false);

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [digestVisible, setDigestVisible] = useState(false);
  const [digestContent, setDigestContent] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  useEffect(() => {
    if (giveFeedback === '1') {
      setFeedbackModalVisible(true);
    }
  }, [giveFeedback]);

  useEffect(() => {
    if (!nameDirty) {
      setNameDraft(profile.displayName ?? '');
    }
  }, [profile.displayName, nameDirty]);

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === profile.displayName) {
      setNameDirty(false);
      return;
    }
    const saved = await updateDisplayName(trimmed);
    setNameDirty(false);
    Toast.show({
      type: saved ? 'success' : 'info',
      text1: saved ? 'Name updated' : 'Saved on this device',
      text2: saved ? undefined : 'Will sync when back online',
    });
  };

  const reschedule = async (overrides: Partial<typeof settings>) => {
    const next = { ...settings, ...overrides };
    await applyRitualSchedule({
      notificationsEnabled: next.notificationsEnabled,
      morningTime: next.morningTime,
      eveningEnabled: next.eveningEnabled,
      eveningTime: next.eveningTime,
      feedbackWeeklyNudge: next.feedbackWeeklyNudge,
      reminderEodReviewEnabled: next.reminderEodReviewEnabled,
    });
  };

  const handleEnableNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Toast.show({ type: 'error', text1: 'Permission denied' });
        return;
      }
    }
    await updateSettings({ notificationsEnabled: value });
    await reschedule({ notificationsEnabled: value });
  };

  const openFeedbackList = () => {
    void updateSettings({ feedbackLastSeenAt: new Date().toISOString() });
    router.push('/feedback' as Href);
  };

  const handleGenerateDigest = async () => {
    setDigestLoading(true);
    try {
      const digest = await generateFeedbackDigest();
      setDigestContent(digest.content);
      setDigestVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Digest failed';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setDigestLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.content}>
        <Section title="Profile" colors={colors} typography={typography}>
          <Text style={[styles.note, { color: colors.textSecondary, marginTop: 0 }]}>
            Used in your greeting and morning briefing.
          </Text>
          <TextInput
            value={nameDraft}
            onChangeText={(text) => {
              setNameDraft(text);
              setNameDirty(true);
            }}
            onBlur={() => void handleSaveName()}
            onSubmitEditing={() => void handleSaveName()}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: radius.md,
              },
            ]}
          />
        </Section>

        <Section title="Appearance" colors={colors} typography={typography}>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((option) => {
              const active = settings.themePref === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => void updateSettings({ themePref: option.value })}
                  style={[
                    styles.segmentItem,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}>
                  <Text
                    style={{
                      color: active ? colors.primaryContrast : colors.textSecondary,
                      fontWeight: '600',
                    }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

      <Section title="Notifications" colors={colors} typography={typography}>
        <Row label="Enable notifications" colors={colors}>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => void handleEnableNotifications(value)}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Row label="End-of-day reminder review" colors={colors}>
          <Switch
            value={settings.reminderEodReviewEnabled}
            disabled={!settings.notificationsEnabled}
            onValueChange={(reminderEodReviewEnabled) => {
              void updateSettings({ reminderEodReviewEnabled });
              void reschedule({ reminderEodReviewEnabled });
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Optional gentle check-in at your evening reflection time. Review reminders that fired
          today — Done, defer, or note what&apos;s blocking.
        </Text>
        <Pressable
          onPress={() => router.push('/reminder-review' as Href)}
          style={[styles.reflectNow, { borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.reflectNowText, { color: colors.primary }]}>
            Open reminder review
          </Text>
        </Pressable>
      </Section>

        <Section title="Morning briefing" colors={colors} typography={typography}>
          <TimeRow
            label="Briefing time"
            value={settings.morningTime}
            colors={colors}
            radius={radius.md}
            onChange={(morningTime) => {
              void updateSettings({ morningTime });
              void reschedule({ morningTime });
            }}
          />
        </Section>

        <Section title="App feedback" colors={colors} typography={typography}>
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            Improvements about LifeOS itself — bugs, UX, feature ideas. Prefix with &quot;fb:&quot;
            or use the button below. Idea threads use &quot;idea: ThreadName&quot;.
          </Text>

          {newCount > 0 ? (
            <View style={[styles.newBadge, { backgroundColor: colors.accentWarm, borderRadius: radius.pill }]}>
              <Text style={[styles.newBadgeText, { color: colors.primaryContrast }]}>
                {newCount} new
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => setFeedbackModalVisible(true)}
            style={[styles.reflectNow, { borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.reflectNowText, { color: colors.primary }]}>Give feedback</Text>
          </Pressable>

          <Pressable
            onPress={openFeedbackList}
            style={[styles.reflectNow, { borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.reflectNowText, { color: colors.primary }]}>View app feedback</Text>
          </Pressable>

          <Row label="Weekly feedback nudge (Sundays 6pm)" colors={colors}>
            <Switch
              value={settings.feedbackWeeklyNudge}
              disabled={!settings.notificationsEnabled}
              onValueChange={(feedbackWeeklyNudge) => {
                void updateSettings({ feedbackWeeklyNudge });
                void reschedule({ feedbackWeeklyNudge });
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </Row>

          <Pressable
            onPress={() => void handleGenerateDigest()}
            disabled={digestLoading}
            style={[styles.reflectNow, { borderColor: colors.border, borderRadius: radius.md }]}>
            {digestLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.reflectNowText, { color: colors.primary }]}>
                Generate feedback backlog
              </Text>
            )}
          </Pressable>
        </Section>

        <Section title="AI usage" colors={colors} typography={typography}>
          {aiUsageLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
          ) : aiUsageError ? (
            <Text style={[styles.note, { color: colors.danger }]}>{aiUsageError}</Text>
          ) : aiUsageMonth && aiUsageAllTime ? (
            <>
              {aiUsageToday ? (
                <>
                  <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Today</Text>
                  <Text style={[styles.usageTotal, { color: colors.textPrimary }]}>
                    {formatUsd(aiUsageToday.totalCostUsd)}
                  </Text>
                  <Text style={[styles.note, { color: colors.textSecondary }]}>
                    {aiUsageToday.callCount} calls
                  </Text>
                </>
              ) : null}

              <Text style={[styles.usageLabel, styles.usageLabelSpaced, { color: colors.textSecondary }]}>
                This month
              </Text>
              <Text style={[styles.usageTotal, { color: colors.textPrimary }]}>
                {formatUsd(aiUsageMonth.totalCostUsd)}
              </Text>
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {aiUsageMonth.callCount} calls · {aiUsageMonth.totalInputTokens.toLocaleString()} in /{' '}
                {aiUsageMonth.totalOutputTokens.toLocaleString()} out
              </Text>

              <Text style={[styles.usageLabel, styles.usageLabelSpaced, { color: colors.textSecondary }]}>
                All time
              </Text>
              <Text style={[styles.usageTotal, { color: colors.textPrimary }]}>
                {formatUsd(aiUsageAllTime.totalCostUsd)}
              </Text>
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {aiUsageAllTime.callCount} calls · {aiUsageAllTime.totalInputTokens.toLocaleString()} in /{' '}
                {aiUsageAllTime.totalOutputTokens.toLocaleString()} out
              </Text>

              {Object.entries(aiUsageMonth.byFunction).length > 0 ? (
                <View style={styles.usageBreakdown}>
                  <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>
                    This month by feature
                  </Text>
                  {Object.entries(aiUsageMonth.byFunction).map(([fn, stats]) => (
                    <Text key={fn} style={[styles.usageRow, { color: colors.textSecondary }]}>
                      {fn}: {formatUsd(stats.cost)} ({stats.calls}×)
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.note, { color: colors.textSecondary }]}>No usage recorded yet.</Text>
          )}
        </Section>

        <Section title="Evening reflection" colors={colors} typography={typography}>
          <Row label="Enable evening reflection" colors={colors}>
            <Switch
              value={settings.eveningEnabled}
              onValueChange={(eveningEnabled) => {
                void updateSettings({ eveningEnabled });
                void reschedule({ eveningEnabled });
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </Row>
          {settings.eveningEnabled ? (
            <TimeRow
              label="Reflection time"
              value={settings.eveningTime}
              colors={colors}
              radius={radius.md}
              onChange={(eveningTime) => {
                void updateSettings({ eveningTime });
                void reschedule({ eveningTime });
              }}
            />
          ) : null}
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            A short, optional moment — highlight, gratitude, and tomorrow&apos;s anchor. Always
            skippable, never about what you didn&apos;t do.
          </Text>
          <Pressable
            onPress={() => router.push('/reflect')}
            style={[styles.reflectNow, { borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.reflectNowText, { color: colors.primary }]}>Reflect now</Text>
          </Pressable>
        </Section>
      </ScrollView>

      <FeedbackCaptureModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={captureText}
      />

      <Modal visible={digestVisible} animationType="slide" onRequestClose={() => setDigestVisible(false)}>
        <View style={[styles.digestRoot, { backgroundColor: colors.bg }]}>
          <View style={[styles.digestHeader, { borderBottomColor: colors.border }]}>
            <Text style={[typography.title, { color: colors.textPrimary }]}>Feedback backlog</Text>
            <Pressable onPress={() => setDigestVisible(false)} hitSlop={12}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.digestBody}>
            <Text style={[styles.digestText, { color: colors.textPrimary }]}>
              {digestContent ?? ''}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Section({
  title,
  colors,
  typography,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  typography: ReturnType<typeof useTheme>['typography'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[typography.title, styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {children}
    </View>
  );
}

function clampTime(hour: number, minute: number): string {
  const h = ((hour % 24) + 24) % 24;
  const m = ((minute % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function TimeRow({
  label,
  value,
  colors,
  radius,
  onChange,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: number;
  onChange: (next: string) => void;
}) {
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number.parseInt(hourStr, 10) || 0;
  const minute = Number.parseInt(minuteStr, 10) || 0;

  const step = (deltaHour: number, deltaMinute: number) => {
    onChange(clampTime(hour + deltaHour, minute + deltaMinute));
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.stepper}>
        <Stepper colors={colors} radius={radius} symbol="–" onPress={() => step(-1, 0)} />
        <Text style={[styles.time, { color: colors.textPrimary }]}>{value}</Text>
        <Stepper colors={colors} radius={radius} symbol="+" onPress={() => step(1, 0)} />
        <View style={styles.minuteGroup}>
          <Stepper colors={colors} radius={radius} symbol="–m" onPress={() => step(0, -15)} />
          <Stepper colors={colors} radius={radius} symbol="+m" onPress={() => step(0, 15)} />
        </View>
      </View>
    </View>
  );
}

function Stepper({
  symbol,
  onPress,
  colors,
  radius,
}: {
  symbol: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.stepperButton,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius },
      ]}>
      <Text style={[styles.stepperText, { color: colors.primary }]}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  nameInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 12,
    minHeight: 44,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 16,
    flexShrink: 1,
    paddingRight: 12,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  newBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reflectNow: {
    marginTop: 16,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  reflectNowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minuteGroup: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 4,
  },
  stepperButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  stepperText: {
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
    minWidth: 56,
    textAlign: 'center',
  },
  digestRoot: {
    flex: 1,
    paddingTop: 48,
  },
  digestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  digestBody: {
    padding: 20,
    paddingBottom: 48,
  },
  digestText: {
    fontSize: 15,
    lineHeight: 24,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 8,
  },
  usageLabelSpaced: {
    marginTop: 16,
  },
  usageTotal: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  usageBreakdown: {
    marginTop: 12,
    gap: 4,
  },
  usageRow: {
    fontSize: 13,
    lineHeight: 18,
  },
});
