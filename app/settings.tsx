import { ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Toast from 'react-native-toast-message';

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
  const router = useRouter();

  const reschedule = async (overrides: Partial<typeof settings>) => {
    const next = { ...settings, ...overrides };
    await applyRitualSchedule({
      notificationsEnabled: next.notificationsEnabled,
      morningTime: next.morningTime,
      eveningEnabled: next.eveningEnabled,
      eveningTime: next.eveningTime,
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
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
          Improvements you capture about LifeOS — bugs, UX, feature ideas. Prefix with
          &quot;fb:&quot; to force feedback routing.
        </Text>
        <Pressable
          onPress={() => router.push('/feedback' as Href)}
          style={[styles.reflectNow, { borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.reflectNowText, { color: colors.primary }]}>View app feedback</Text>
        </Pressable>
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
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
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
});
