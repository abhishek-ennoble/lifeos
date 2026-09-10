import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DomainIcon } from '@/components/DomainIcon';
import { EntryDetailModal } from '@/components/EntryDetailModal';
import { HabitStrength } from '@/components/HabitStrength';
import { DOMAINS, LIFE_AREA_LABELS, isLifeArea } from '@/constants/domains';
import { useTheme } from '@/hooks/useTheme';
import { getEntryReminderLabel, entryHasScheduledReminder } from '@/lib/reminder-plan';
import { getIdeaThread } from '@/lib/idea-threads';
import { pendingFollowUps, sourceBadge } from '@/lib/follow-ups';
import type { Entry } from '@/types/entry';

interface EntryCardProps {
  entry: Entry;
  highlighted?: boolean;
  onDone?: (id: string) => void;
  onDelete?: (id: string) => void;
  onLogSession?: (id: string) => void;
}

export function EntryCard({ entry, highlighted, onDone, onDelete, onLogSession }: EntryCardProps) {
  const { colors, radius, spacing } = useTheme();
  const [detailOpen, setDetailOpen] = useState(false);
  const lifeArea = (entry.metadata as { life_area?: string } | null)?.life_area;
  const showLifeArea = lifeArea && isLifeArea(lifeArea) ? lifeArea : null;
  const reminderLabel = getEntryReminderLabel(entry);
  const hasReminder = entryHasScheduledReminder(entry);
  const ideaThread = getIdeaThread(entry);
  const source = sourceBadge(entry);
  const openQuestions = pendingFollowUps(entry).length;

  return (
    <>
      <Pressable
        onPress={() => setDetailOpen(true)}
        accessibilityRole="button"
        accessibilityHint="Opens full entry text"
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: highlighted ? colors.primary : colors.border,
            borderRadius: radius.md,
            borderWidth: highlighted ? 2 : 1,
          },
        ]}>
        <View style={styles.header}>
          <DomainIcon domain={entry.domain} size={28} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{entry.title}</Text>
            {entry.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                {entry.description}
              </Text>
            ) : null}
          </View>
        </View>

        {entry.domain === DOMAINS.HEALTH ? <HabitStrength entry={entry} /> : null}

        <View style={styles.metaRow}>
          {showLifeArea ? (
            <Text
              style={[
                styles.badge,
                { backgroundColor: colors.bg, color: colors.lifeArea[showLifeArea] },
              ]}>
              {LIFE_AREA_LABELS[showLifeArea]}
            </Text>
          ) : null}
          <Text style={[styles.badge, { backgroundColor: colors.bg, color: colors.textSecondary }]}>
            {entry.priority}
          </Text>
          {entry.is_recurring ? (
            <Text style={[styles.badge, { backgroundColor: colors.bg, color: colors.textSecondary }]}>
              recurring
            </Text>
          ) : null}
          {hasReminder ? (
            <Text style={[styles.badge, { backgroundColor: colors.bg, color: colors.primary }]}>
              🔔 {reminderLabel}
            </Text>
          ) : null}
          {ideaThread ? (
            <Text
              style={[
                styles.badge,
                { backgroundColor: colors.bg, color: colors.domain[DOMAINS.IDEA] },
              ]}>
              {ideaThread}
            </Text>
          ) : null}
          {source ? (
            <Text style={[styles.badge, { backgroundColor: colors.bg, color: colors.textSecondary }]}>
              via {source}
            </Text>
          ) : null}
          {openQuestions > 0 ? (
            <Text style={[styles.badge, { backgroundColor: colors.bg, color: colors.accentWarm }]}>
              {openQuestions} {openQuestions === 1 ? 'question' : 'questions'}
            </Text>
          ) : null}
        </View>

        <View style={[styles.actions, { marginTop: spacing.md }]}>
          {onDone ? (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.bg }]}
              onPress={() => onDone(entry.id)}>
              <Text style={[styles.actionText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          ) : null}
          {onLogSession ? (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.bg }]}
              onPress={() => onLogSession(entry.id)}>
              <Text style={[styles.actionText, { color: colors.primary }]}>Log session</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.bg }]}
              onPress={() => onDelete(entry.id)}>
              <Text style={[styles.actionText, { color: colors.danger }]}>Archive</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>

      <EntryDetailModal
        entry={entry}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDone={onDone}
        onDelete={onDelete}
        onLogSession={onLogSession}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
