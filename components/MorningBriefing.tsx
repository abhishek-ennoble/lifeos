import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { splitBriefingPreview } from '@/lib/briefing-preview';
import type { Briefing } from '@/types/entry';

interface MorningBriefingProps {
  briefing: Briefing | null;
  loading: boolean;
  onGenerate?: () => void;
  /** @deprecated Greeting now lives in the Home header; kept for callers. */
  greeting?: string;
}

/**
 * F21: the briefing must never push capture below the fold. Collapsed by
 * default to its first paragraph; one tap expands the rest.
 */
export function MorningBriefing({ briefing, loading, onGenerate, greeting }: MorningBriefingProps) {
  const { colors, radius } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const { preview, rest } = useMemo(
    () => splitBriefingPreview(briefing?.content ?? ''),
    [briefing?.content],
  );

  return (
    <View>
      {greeting ? (
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>{greeting}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : briefing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse briefing' : 'Expand briefing'}
          onPress={() => (rest ? setExpanded((value) => !value) : undefined)}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
          ]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>This morning</Text>
          <Text style={[styles.content, { color: colors.textPrimary }]}>{preview}</Text>
          {expanded && rest ? (
            <Text style={[styles.content, styles.rest, { color: colors.textPrimary }]}>{rest}</Text>
          ) : null}
          {rest ? (
            <Text style={[styles.toggle, { color: colors.primary }]}>
              {expanded ? 'Less' : 'More'}
            </Text>
          ) : null}
        </Pressable>
      ) : (
        <View style={styles.placeholderRow}>
          <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
            Your briefing arrives each morning.
          </Text>
          {onGenerate ? (
            <Pressable hitSlop={8} onPress={onGenerate} accessibilityRole="button">
              <Text style={[styles.toggle, { color: colors.primary }]}>Generate now</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 16,
    alignSelf: 'flex-start',
  },
  card: {
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  rest: {
    marginTop: 12,
  },
  toggle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
