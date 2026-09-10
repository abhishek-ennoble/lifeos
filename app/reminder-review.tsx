import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';
import { getTodaysReminderFires } from '@/lib/reminder-fire-log';
import {
  createLinkedFollowUpTask,
  markReminderBlocked,
  markReminderDone,
  snoozeReminderUntilTomorrow,
} from '@/lib/reminder-actions';
import type { Entry } from '@/types/entry';

export default function ReminderReviewScreen() {
  const { colors, typography, radius } = useTheme();
  const { entries, loading, refresh } = useEntries();
  const [fires, setFires] = useState<Array<{ entryId: string; firedAt: string }>>([]);
  const [loadingFires, setLoadingFires] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [blockNote, setBlockNote] = useState('');

  const loadFires = useCallback(async () => {
    setLoadingFires(true);
    try {
      setFires(await getTodaysReminderFires());
    } finally {
      setLoadingFires(false);
    }
  }, []);

  useEffect(() => {
    void loadFires();
    void refresh();
  }, [loadFires, refresh]);

  const reviewEntries = useMemo(() => {
    const firedIds = new Set(fires.map((fire) => fire.entryId));
    return entries.filter((entry) => firedIds.has(entry.id) && entry.status === 'pending');
  }, [entries, fires]);

  const handleDone = async (entry: Entry) => {
    const ok = await markReminderDone(entry.id);
    if (ok) {
      await loadFires();
      await refresh();
    }
  };

  const handleSnoozeTomorrow = async (entry: Entry) => {
    const ok = await snoozeReminderUntilTomorrow(entry.id);
    if (ok) {
      await loadFires();
      await refresh();
    }
  };

  const handleStillPending = async (entry: Entry) => {
    const note = blockNote.trim();
    if (note) {
      await markReminderBlocked(entry.id, note);
    }
    setExpandedId(null);
    setBlockNote('');
    await loadFires();
    await refresh();
    Toast.show({ type: 'info', text1: 'Noted', text2: 'Still on your list' });
  };

  const handleFollowUp = async (entry: Entry) => {
    const note = blockNote.trim();
    await markReminderBlocked(entry.id, note);
    await createLinkedFollowUpTask(entry, note);
    setExpandedId(null);
    setBlockNote('');
    await loadFires();
    await refresh();
  };

  if (loading || loadingFires) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Text style={[typography.body, styles.intro, { color: colors.textSecondary }]}>
        A quick look at reminders that fired today. Done, defer, or note what&apos;s blocking — no
        guilt, just clarity.
      </Text>

      {reviewEntries.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Nothing to review right now. Reminders you act on from notifications will show up here
          after they fire.
        </Text>
      ) : (
        reviewEntries.map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}>
            <Text style={[typography.title, { color: colors.textPrimary }]}>{entry.title}</Text>
            {entry.description ? (
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                {entry.description}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <ActionButton
                label="Done"
                colors={colors}
                radius={radius.sm}
                primary
                onPress={() => void handleDone(entry)}
              />
              <ActionButton
                label="Tomorrow"
                colors={colors}
                radius={radius.sm}
                onPress={() => void handleSnoozeTomorrow(entry)}
              />
              <ActionButton
                label="Still pending"
                colors={colors}
                radius={radius.sm}
                onPress={() => {
                  setExpandedId(expandedId === entry.id ? null : entry.id);
                  setBlockNote('');
                }}
              />
            </View>

            {expandedId === entry.id ? (
              <View style={styles.expand}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      borderRadius: radius.sm,
                    },
                  ]}
                  placeholder="What's blocking? (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={blockNote}
                  onChangeText={setBlockNote}
                  multiline
                />
                <View style={styles.expandActions}>
                  <Pressable onPress={() => void handleStillPending(entry)}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Save note</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleFollowUp(entry)}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                      + Follow-up task
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ActionButton({
  label,
  colors,
  radius,
  primary,
  onPress,
}: {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: number;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionBtn,
        {
          backgroundColor: primary ? colors.primary : colors.bg,
          borderColor: colors.border,
          borderRadius: radius,
        },
      ]}>
      <Text
        style={{
          color: primary ? colors.primaryContrast : colors.textPrimary,
          fontWeight: '600',
          fontSize: 13,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  intro: {
    marginBottom: 20,
    lineHeight: 22,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  expand: {
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    minHeight: 72,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  expandActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
