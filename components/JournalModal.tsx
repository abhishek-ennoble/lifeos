import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { ALL_LIFE_AREAS, LIFE_AREA_LABELS, type LifeArea } from '@/constants/domains';
import { useTheme } from '@/hooks/useTheme';
import type { JournalInput } from '@/hooks/useEntries';

interface JournalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: JournalInput) => Promise<void | unknown>;
}

export function JournalModal({ visible, onClose, onSave }: JournalModalProps) {
  const { colors, radius } = useTheme();
  const [text, setText] = useState('');
  const [lifeArea, setLifeArea] = useState<LifeArea | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }
    setLoading(true);
    try {
      await onSave({ text: trimmed, lifeArea: lifeArea ?? undefined });
      setText('');
      setLifeArea(null);
      onClose();
      Toast.show({ type: 'success', text1: 'Journal saved' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Journal</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A space to reflect. Nothing here becomes a task unless you ask.
          </Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="What's present for you right now?"
            placeholderTextColor={colors.textSecondary}
            multiline
            autoFocus
          />

          <View style={styles.chipRow}>
            {ALL_LIFE_AREAS.map((area) => {
              const active = lifeArea === area;
              return (
                <Pressable
                  key={area}
                  onPress={() => setLifeArea(active ? null : area)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.lifeArea[area] : colors.border,
                      backgroundColor: active ? colors.lifeArea[area] : 'transparent',
                      borderRadius: radius.pill,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.primaryContrast : colors.textSecondary },
                    ]}>
                    {LIFE_AREA_LABELS[area]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.save, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              onPress={() => void handleSave()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.primaryContrast} />
              ) : (
                <Text style={[styles.saveText, { color: colors.primaryContrast }]}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '55%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 140,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  cancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 16,
  },
  save: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
