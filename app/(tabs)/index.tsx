import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { BrainDumpModal, CaptureInput } from '@/components/CaptureInput';
import { MorningBriefing } from '@/components/MorningBriefing';
import { VoiceInput } from '@/components/VoiceInput';
import { useAntiEntropy } from '@/hooks/useChat';
import { useBriefing } from '@/hooks/useBriefing';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';
import { selectToday, todayMeta } from '@/lib/entry-utils';
import { requestNotificationPermissions } from '@/lib/notifications';

const ONBOARDING_EXAMPLES = [
  'Buy milk tomorrow',
  'Idea: a weekend side project',
  'Practice guitar daily at 7pm',
];

function timeAwareGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) {
    return 'Still up, Abhishek';
  }
  if (hour < 12) {
    return 'Good morning, Abhishek';
  }
  if (hour < 17) {
    return 'Good afternoon, Abhishek';
  }
  return 'Good evening, Abhishek';
}

export default function HomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, captureText, updateEntryStatus } = useEntries();
  const { briefing, loading: briefingLoading, generateBriefing } = useBriefing();
  const { staleCount } = useAntiEntropy();
  const [brainDumpVisible, setBrainDumpVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  const today = useMemo(() => selectToday(entries, 3), [entries]);

  const handleVoiceCapture = async (text: string) => {
    await captureText(text);
  };

  const setupNotifications = async () => {
    const granted = await requestNotificationPermissions();
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
          <View style={{ flex: 1 }} />
          <Link href="/settings" asChild>
            <Pressable hitSlop={12} accessibilityLabel="Settings">
              <SymbolView
                name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                size={22}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </Link>
        </View>

        <MorningBriefing
          greeting={timeAwareGreeting()}
          briefing={briefing}
          loading={briefingLoading}
          onGenerate={() => void generateBriefing()}
        />

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
                    onPress={() => void captureText(example)}>
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

        {typing ? (
          <View style={styles.typeBox}>
            <CaptureInput onSubmit={captureText} />
          </View>
        ) : null}

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
          <SecondaryAction
            label="Notifications"
            onPress={() => void setupNotifications()}
            color={colors.textSecondary}
          />
        </View>
      </ScrollView>

      <View style={[styles.fabBar, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <Pressable
          style={styles.typeToggle}
          hitSlop={8}
          onPress={() => setTyping((value) => !value)}>
          <Text style={[styles.typeToggleText, { color: colors.textSecondary }]}>
            {typing ? 'Hide keyboard' : 'or type'}
          </Text>
        </Pressable>
        <VoiceInput variant="fab" onTranscribed={handleVoiceCapture} />
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
    marginBottom: 8,
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
  typeBox: {
    marginTop: 24,
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
  typeToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
