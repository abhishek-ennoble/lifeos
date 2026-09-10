import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { readAppStorage, writeAppStorage } from '@/lib/app-storage';
import { applyRitualSchedule, requestNotificationPermissions } from '@/lib/notifications';
import { loadProfile, saveDisplayName } from '@/lib/profile';

const ONBOARDING_DONE_KEY = 'lifeos.onboarding.v1';

type Step = 'loading' | 'name' | 'notifications' | 'done';

interface OnboardingGateProps {
  children: React.ReactNode;
}

/**
 * First-run gate: ask the user's name, then offer the morning nudge.
 * Skipped entirely when the account already has a display name (reinstall)
 * or onboarding was completed on this device. Zero-decision by design —
 * one input, one choice, everything skippable.
 */
export function OnboardingGate({ children }: OnboardingGateProps) {
  const { colors, radius } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [step, setStep] = useState<Step>('loading');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const done = await readAppStorage(ONBOARDING_DONE_KEY);
        if (done === 'done') {
          if (active) {
            setStep('done');
          }
          return;
        }

        const profile = await loadProfile();
        if (profile.displayName) {
          // Existing account — don't re-onboard, just mark complete.
          await writeAppStorage(ONBOARDING_DONE_KEY, 'done');
          if (active) {
            setStep('done');
          }
          return;
        }

        if (active) {
          setStep('name');
        }
      } catch {
        // Never block the app on onboarding — fail open.
        if (active) {
          setStep('done');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const finish = async () => {
    try {
      await writeAppStorage(ONBOARDING_DONE_KEY, 'done');
    } catch {
      // Best-effort; worst case onboarding shows once more.
    }
    setStep('done');
  };

  const handleNameContinue = async () => {
    const trimmed = name.trim();
    setBusy(true);
    try {
      if (trimmed) {
        await saveDisplayName(trimmed);
      }
      setStep('notifications');
    } finally {
      setBusy(false);
    }
  };

  const handleEnableNotifications = async () => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await updateSettings({ notificationsEnabled: true });
        await applyRitualSchedule({
          ...settings,
          notificationsEnabled: true,
        });
      }
      await finish();
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return <>{children}</>;
  }

  if (step === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {step === 'name' ? (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome to LifeOS</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            A quiet place to empty your mind. When it feels full, open the app, dump what&apos;s
            there — tasks, ideas, anything — and it gets sorted for you.
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: radius.md,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="What should I call you?"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void handleNameContinue()}
          />
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            onPress={() => void handleNameContinue()}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.primaryContrast} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>Continue</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            One gentle nudge each morning?
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            A short briefing at {settings.morningTime} — what matters today, nothing more. Quiet
            by default, and you can change or turn it off anytime in Settings.
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            onPress={() => void handleEnableNotifications()}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.primaryContrast} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>
                Sounds good
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => void finish()} disabled={busy} hitSlop={8}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Not now</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 48,
  },
  button: {
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  skip: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});
