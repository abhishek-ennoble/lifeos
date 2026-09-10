import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { InboxFilters } from '@/lib/inbox-query';
import { useTheme } from '@/hooks/useTheme';

interface InboxFiltersModalProps {
  visible: boolean;
  filters: InboxFilters;
  onClose: () => void;
  onChange: (partial: Partial<InboxFilters>) => void;
  onReset: () => void;
}

export function InboxFiltersModal({
  visible,
  filters,
  onClose,
  onChange,
  onReset,
}: InboxFiltersModalProps) {
  const { colors, radius, typography } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}
          onPress={(event) => event.stopPropagation()}>
          <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
            Inbox filters
          </Text>

          <FilterRow
            label="Pending only"
            hint="Hide done items"
            colors={colors}
            value={filters.pendingOnly}
            onValueChange={(pendingOnly) => onChange({ pendingOnly })}
          />
          <FilterRow
            label="Has reminder"
            hint="Scheduled notification"
            colors={colors}
            value={filters.hasReminder}
            onValueChange={(hasReminder) => onChange({ hasReminder })}
          />
          <FilterRow
            label="Has due date"
            colors={colors}
            value={filters.hasDueDate}
            onValueChange={(hasDueDate) => onChange({ hasDueDate })}
          />

          <View style={styles.actions}>
            <Pressable onPress={onReset} style={styles.reset}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.done, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
              <Text style={{ color: colors.primaryContrast, fontWeight: '600' }}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterRow({
  label,
  hint,
  colors,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  colors: ReturnType<typeof useTheme>['colors'];
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.rowHint, { color: colors.textSecondary }]}>{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowHint: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  reset: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  done: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
});
