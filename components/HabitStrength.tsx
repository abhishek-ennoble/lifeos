import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { Entry } from '@/types/entry';

interface HabitStrengthProps {
  entry: Entry;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Momentum / "strength" indicator for habits — NOT a fragile streak counter.
 *
 * Research (DESIGN_SYSTEM §6): ~78% of users quit habit apps within 2 weeks due
 * to streak anxiety. We show a gentle strength curve + kind, identity-framed
 * copy. One missed day never reads as failure or resets anything; a grace
 * window absorbs lapses quietly (Lally 2010).
 */
export function HabitStrength({ entry }: HabitStrengthProps) {
  const { colors, radius } = useTheme();

  const reference = entry.last_reviewed_at ?? entry.updated_at ?? entry.created_at;
  const daysSince = reference
    ? Math.floor((Date.now() - new Date(reference).getTime()) / DAY_MS)
    : 0;

  // Strength decays gently with inactivity but never hits zero — history is
  // never erased. A single missed day (grace window) keeps strength high.
  const strength = clamp01(1 - Math.max(0, daysSince - 1) * 0.12);
  const lapsed = daysSince >= 2;

  const label = lapsed
    ? 'Yesterday slipped by — today is a fresh start.'
    : "You're becoming someone who shows up.";

  return (
    <View style={styles.container}>
      <View
        style={[styles.track, { backgroundColor: colors.border, borderRadius: radius.pill }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(strength * 100)}%`,
              backgroundColor: colors.accentWarm,
              borderRadius: radius.pill,
            },
          ]}
        />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function clamp01(value: number): number {
  if (value < 0.08) {
    return 0.08;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 6,
  },
  track: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
