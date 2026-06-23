import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { JournalModal } from '@/components/JournalModal';
import { DOMAINS } from '@/constants/domains';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';
import type { Entry } from '@/types/entry';

/** Read-back view for manual journal / reflection entries (domain='journal'). */
export default function JournalScreen() {
  const { colors, typography, radius, spacing } = useTheme();
  const router = useRouter();
  const { entries, loading, captureJournal } = useEntries();
  const [composeVisible, setComposeVisible] = useState(false);

  const journals = useMemo(
    () => entries.filter((entry) => entry.domain === DOMAINS.JOURNAL),
    [entries],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.display, { color: colors.textPrimary }]}>Journal</Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Your reflections, kept. Nothing here nags you — it&apos;s just for looking back.
        </Text>

        <Pressable
          style={[styles.newButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => setComposeVisible(true)}>
          <Text style={[styles.newButtonText, { color: colors.primaryContrast }]}>+ New entry</Text>
        </Pressable>

        {loading && journals.length === 0 ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
        ) : null}

        {!loading && journals.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No journal entries yet. Write your first reflection above.
          </Text>
        ) : null}

        {journals.map((entry) => (
          <JournalCard
            key={entry.id}
            entry={entry}
            colors={colors}
            radius={radius}
            onDiscuss={() =>
              router.push({
                pathname: '/chat',
                params: { seed: (entry.description ?? entry.title).slice(0, 1500) },
              })
            }
          />
        ))}
      </ScrollView>

      <JournalModal
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onSave={captureJournal}
      />
    </View>
  );
}

interface JournalCardProps {
  entry: Entry;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
  onDiscuss: () => void;
}

function JournalCard({ entry, colors, radius, onDiscuss }: JournalCardProps) {
  const meta = entry.metadata as
    | { mood?: string; highlight?: string; gratitude?: string; tomorrow_anchor?: string }
    | null;
  const date = new Date(entry.created_at).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
      ]}>
      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{date}</Text>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{entry.title}</Text>
      {entry.description && entry.description !== entry.title ? (
        <Text style={[styles.cardBody, { color: colors.textPrimary }]}>{entry.description}</Text>
      ) : null}

      {meta?.mood ? (
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Mood: {meta.mood}</Text>
      ) : null}

      <Pressable hitSlop={8} onPress={onDiscuss} style={styles.discuss}>
        <Text style={[styles.discussText, { color: colors.primary }]}>Discuss with AI →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
  newButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 24,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 32,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 10,
  },
  discuss: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  discussText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
