import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { Briefing } from '@/types/entry';

interface MorningBriefingProps {
  briefing: Briefing | null;
  loading: boolean;
  onGenerate?: () => void;
  greeting?: string;
}

export function MorningBriefing({ briefing, loading, onGenerate, greeting }: MorningBriefingProps) {
  const { colors, radius, typography } = useTheme();

  return (
    <View>
      {greeting ? (
        <Text style={[typography.display, styles.greeting, { color: colors.textPrimary }]}>
          {greeting}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : briefing ? (
        <Text style={[styles.content, { color: colors.textPrimary }]}>{briefing.content}</Text>
      ) : (
        <View>
          <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
            Your briefing arrives each morning. Until then, capture whatever is on your mind.
          </Text>
          {onGenerate ? (
            <Pressable
              style={[styles.button, { borderColor: colors.border, borderRadius: radius.pill }]}
              onPress={onGenerate}>
              <Text style={[styles.buttonText, { color: colors.primary }]}>Generate now</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
    alignSelf: 'flex-start',
  },
  content: {
    fontSize: 17,
    lineHeight: 27,
  },
  placeholder: {
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
