import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DomainIcon } from '@/components/DomainIcon';
import { DOMAIN_LABELS, LIFE_AREA_LABELS, isLifeArea } from '@/constants/domains';
import { useTheme } from '@/hooks/useTheme';
import { getIdeaThread } from '@/lib/idea-threads';
import { snoozeReminderEntry, snoozeReminderUntilTomorrow } from '@/lib/reminder-actions';
import { entryHasScheduledReminder, getEntryReminderLabel } from '@/lib/reminder-plan';
import type { Entry } from '@/types/entry';

interface EntryDetailModalProps {
  entry: Entry | null;
  visible: boolean;
  onClose: () => void;
  onDone?: (id: string) => void;
  onDelete?: (id: string) => void;
  onLogSession?: (id: string) => void;
}

function formatWhen(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function EntryDetailModal({
  entry,
  visible,
  onClose,
  onDone,
  onDelete,
  onLogSession,
}: EntryDetailModalProps) {
  const { colors, radius, typography } = useTheme();

  if (!entry) {
    return null;
  }

  const lifeArea = (entry.metadata as { life_area?: string } | null)?.life_area;
  const showLifeArea = lifeArea && isLifeArea(lifeArea) ? lifeArea : null;
  const reminderLabel = getEntryReminderLabel(entry);
  const hasReminder = entryHasScheduledReminder(entry);
  const ideaThread = getIdeaThread(entry);
  const created = formatWhen(entry.created_at);
  const due = formatWhen(entry.due_at);
  const raw = entry.raw_input?.trim() ?? '';
  const description = entry.description?.trim() ?? '';
  const showRaw =
    raw.length > 0 &&
    raw !== description &&
    raw !== entry.title.trim();

  const handleDone = () => {
    onDone?.(entry.id);
    onClose();
  };

  const handleDelete = () => {
    onDelete?.(entry.id);
    onClose();
  };

  const handleLogSession = () => {
    onLogSession?.(entry.id);
    onClose();
  };

  const handleRemindLater = (mode: 'hour' | 'tomorrow') => {
    // Reuses the snooze path: updates remind_at, reschedules the local
    // notification, and records the change — simple reminder edit (F5).
    if (mode === 'hour') {
      void snoozeReminderEntry(entry.id, 60);
    } else {
      void snoozeReminderUntilTomorrow(entry.id);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <DomainIcon domain={entry.domain} size={32} />
            <View style={styles.headerText}>
              <Text style={[styles.domainLabel, { color: colors.textSecondary }]}>
                {DOMAIN_LABELS[entry.domain]}
              </Text>
              <Text style={[typography.title, { color: colors.textPrimary }]}>{entry.title}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled">
            {description ? (
              <TextBlock
                label="Details"
                body={description}
                colors={colors}
              />
            ) : null}

            {showRaw ? (
              <TextBlock
                label="Original capture"
                body={raw}
                colors={colors}
              />
            ) : null}

            {!description && !showRaw ? (
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                No extra text on this entry.
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <MetaChip label={entry.priority} colors={colors} />
              <MetaChip label={entry.status} colors={colors} />
              {showLifeArea ? (
                <MetaChip label={LIFE_AREA_LABELS[showLifeArea]} colors={colors} />
              ) : null}
              {hasReminder ? (
                <MetaChip label={`🔔 ${reminderLabel}`} colors={colors} accent />
              ) : null}
              {ideaThread ? <MetaChip label={ideaThread} colors={colors} accent /> : null}
              {entry.is_recurring ? <MetaChip label="recurring" colors={colors} /> : null}
            </View>

            <View style={styles.facts}>
              {created ? (
                <Text style={[styles.fact, { color: colors.textSecondary }]}>Captured {created}</Text>
              ) : null}
              {due ? (
                <Text style={[styles.fact, { color: colors.textSecondary }]}>Due {due}</Text>
              ) : null}
            </View>

            {hasReminder && entry.status === 'pending' ? (
              <View style={styles.remindRow}>
                <Text style={[styles.textLabel, { color: colors.textSecondary }]}>
                  Adjust reminder
                </Text>
                <View style={styles.remindButtons}>
                  <Pressable
                    style={[styles.remindButton, { borderColor: colors.border, borderRadius: radius.md }]}
                    onPress={() => handleRemindLater('hour')}>
                    <Text style={[styles.remindText, { color: colors.primary }]}>In 1 hour</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.remindButton, { borderColor: colors.border, borderRadius: radius.md }]}
                    onPress={() => handleRemindLater('tomorrow')}>
                    <Text style={[styles.remindText, { color: colors.primary }]}>Tomorrow 9am</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            {onDone && entry.status === 'pending' ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.bg }]}
                onPress={handleDone}>
                <Text style={[styles.actionText, { color: colors.primary }]}>Done</Text>
              </Pressable>
            ) : null}
            {onLogSession ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.bg }]}
                onPress={handleLogSession}>
                <Text style={[styles.actionText, { color: colors.primary }]}>Log session</Text>
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.bg }]}
                onPress={handleDelete}>
                <Text style={[styles.actionText, { color: colors.danger }]}>Archive</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              onPress={onClose}>
              <Text style={[styles.closeText, { color: colors.primaryContrast }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TextBlock({
  label,
  body,
  colors,
}: {
  label: string;
  body: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.textBlock}>
      <Text style={[styles.textLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.textBody, { color: colors.textPrimary }]} selectable>
        {body}
      </Text>
    </View>
  );
}

function MetaChip({
  label,
  colors,
  accent,
}: {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  accent?: boolean;
}) {
  return (
    <Text
      style={[
        styles.chip,
        {
          backgroundColor: colors.bg,
          color: accent ? colors.primary : colors.textSecondary,
        },
      ]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  handleRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  domainLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 16,
  },
  textBlock: {
    gap: 6,
  },
  textLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textBody: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyBody: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  facts: {
    gap: 4,
  },
  fact: {
    fontSize: 13,
  },
  remindRow: {
    gap: 8,
  },
  remindButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  remindButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  remindText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
