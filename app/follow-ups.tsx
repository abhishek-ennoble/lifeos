import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { DomainIcon } from '@/components/DomainIcon';
import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';
import {
  answerFollowUp,
  entriesWithPendingFollowUps,
  pendingFollowUps,
  sourceBadge,
} from '@/lib/follow-ups';
import type { Entry, FollowUp } from '@/types/entry';

/**
 * Questions the assistant parked on entries, answered on the user's time.
 * One question at a time per entry; answering sharpens the entry so later
 * agents (IdeaBox, Researcher) start from a real brief instead of a fragment.
 */
export default function FollowUpsScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { entries, updateEntryMetadata } = useEntries();

  const waiting = useMemo(() => entriesWithPendingFollowUps(entries), [entries]);
  const total = useMemo(
    () => waiting.reduce((sum, entry) => sum + pendingFollowUps(entry).length, 0),
    [waiting],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={waiting}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[typography.display, { color: colors.textPrimary }]}>Follow-ups</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {total === 0
                ? 'Nothing waiting on you. Lovely.'
                : `${total} ${total === 1 ? 'question' : 'questions'} to sharpen what you captured. Answer any, skip the rest — no rush.`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FollowUpCard
            entry={item}
            onAnswer={async (followUp, answer) => {
              try {
                await updateEntryMetadata(item.id, answerFollowUp(item.metadata, followUp.id, answer));
                Toast.show({ type: 'success', text1: 'Noted', text2: item.title });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Could not save';
                Toast.show({ type: 'error', text1: 'Could not save answer', text2: message });
              }
            }}
            onOpen={() =>
              router.push({ pathname: '/(tabs)/inbox', params: { highlightEntryId: item.id } })
            }
          />
        )}
      />
    </View>
  );
}

interface FollowUpCardProps {
  entry: Entry;
  onAnswer: (followUp: FollowUp, answer: string) => Promise<void>;
  onOpen: () => void;
}

function FollowUpCard({ entry, onAnswer, onOpen }: FollowUpCardProps) {
  const { colors, radius } = useTheme();
  const pending = pendingFollowUps(entry);
  const current = pending[0];
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const source = sourceBadge(entry);

  if (!current) {
    return null;
  }

  const submit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || saving) {
      return;
    }
    setSaving(true);
    try {
      await onAnswer(current, trimmed);
      setDraft('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
      ]}>
      <Pressable style={styles.cardHeader} onPress={onOpen} accessibilityRole="button">
        <DomainIcon domain={entry.domain} size={24} />
        <View style={styles.cardHeaderText}>
          <Text style={[styles.entryTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {entry.title}
          </Text>
          <Text style={[styles.entryMeta, { color: colors.textSecondary }]}>
            {[source, pending.length > 1 ? `${pending.length} questions` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </Pressable>

      <Text style={[styles.question, { color: colors.textPrimary }]}>{current.question}</Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            color: colors.textPrimary,
            borderRadius: radius.sm,
          },
        ]}
        value={draft}
        onChangeText={setDraft}
        placeholder="Your answer…"
        placeholderTextColor={colors.textSecondary}
        multiline
      />

      <View style={styles.actions}>
        <Pressable
          onPress={() => void submit()}
          disabled={!draft.trim() || saving}
          style={[
            styles.saveButton,
            {
              backgroundColor: draft.trim() ? colors.primary : colors.border,
              borderRadius: radius.sm,
            },
          ]}>
          <Text style={[styles.saveText, { color: colors.primaryContrast }]}>
            {saving ? 'Saving…' : 'Save answer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 16,
  },
  hint: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  entryMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  question: {
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
