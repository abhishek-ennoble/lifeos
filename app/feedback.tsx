import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFeedback } from '@/hooks/useFeedback';
import { useTheme } from '@/hooks/useTheme';
import type { FeedbackSource, FeedbackStatus } from '@/types/feedback';

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  done: 'Done',
};

const SOURCE_LABELS: Record<FeedbackSource, string> = {
  capture: 'Capture',
  backfill: 'Recovered',
  chat: 'Chat',
};

function statusColor(status: FeedbackStatus, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (status) {
    case 'new':
      return colors.accentWarm;
    case 'triaged':
      return colors.primary;
    case 'done':
      return colors.textSecondary;
  }
}

export default function FeedbackScreen() {
  const { colors, typography, radius } = useTheme();
  const { feedback, loading, error, updateStatus } = useFeedback();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <FlatList
        data={feedback}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No app feedback yet. Start a capture with &quot;fb:&quot; or describe an app issue.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}>
            <View style={styles.cardHeader}>
              <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
              <View style={styles.badges}>
                <Text
                  style={[
                    styles.badge,
                    {
                      color: statusColor(item.status, colors),
                      borderColor: statusColor(item.status, colors),
                      borderRadius: radius.sm,
                    },
                  ]}>
                  {STATUS_LABELS[item.status]}
                </Text>
                <Text style={[styles.badgeMuted, { color: colors.textSecondary }]}>
                  {SOURCE_LABELS[item.source]}
                </Text>
              </View>
            </View>

            {item.theme ? (
              <Text style={[styles.theme, { color: colors.primary }]}>{item.theme}</Text>
            ) : null}

            <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={6}>
              {item.body}
            </Text>

            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>

            {item.status !== 'done' ? (
              <View style={styles.actions}>
                {item.status === 'new' ? (
                  <Pressable
                    onPress={() => void updateStatus(item.id, 'triaged')}
                    style={[styles.actionButton, { borderColor: colors.border, borderRadius: radius.sm }]}>
                    <Text style={[styles.actionText, { color: colors.primary }]}>Mark triaged</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void updateStatus(item.id, 'done')}
                  style={[styles.actionButton, { borderColor: colors.border, borderRadius: radius.sm }]}>
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>Mark done</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 48,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  error: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMuted: {
    fontSize: 12,
  },
  theme: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
