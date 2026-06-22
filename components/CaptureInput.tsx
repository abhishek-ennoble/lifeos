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

import { darkTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CaptureInputProps {
  onSubmit: (text: string) => Promise<void | null | unknown>;
  placeholder?: string;
  compact?: boolean;
}

export function CaptureInput({
  onSubmit,
  placeholder = 'Type anything — I will organize it...',
  compact = false,
}: CaptureInputProps) {
  const { colors, radius } = useTheme();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(trimmed);
      setText('');
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Captured and routed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Capture failed';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <TextInput
          style={[
            styles.compactInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
              borderRadius: radius.md,
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={() => void handleSubmit()}
        />
        <Pressable
          style={[styles.compactButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => void handleSubmit()}>
          {loading ? (
            <ActivityIndicator color={colors.primaryContrast} size="small" />
          ) : (
            <Text style={[styles.compactButtonText, { color: colors.primaryContrast }]}>Add</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
            borderRadius: radius.md,
          },
        ]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline
      />
      <Pressable
        style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.md }]}
        onPress={() => void handleSubmit()}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>Capture</Text>
        )}
      </Pressable>
    </View>
  );
}

interface BrainDumpModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void | null | unknown>;
}

/**
 * 2am brain dump. Always rendered in the darkest calm palette regardless of the
 * active theme — no bright whites that wake the user further (DESIGN_SYSTEM §8).
 */
export function BrainDumpModal({ visible, onClose, onSubmit }: BrainDumpModalProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const night = darkTheme;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(trimmed);
      setText('');
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Saved for morning',
        text2: "I'll handle it when you wake up",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: night.bg }]}>
          <Text style={[styles.modalTitle, { color: night.textPrimary }]}>Brain dump</Text>
          <Text style={[styles.modalSubtitle, { color: night.textSecondary }]}>
            No need to organize. Speak or type — I&apos;ll handle it in the morning.
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              { backgroundColor: night.surfaceRaised, color: night.textPrimary },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind?"
            placeholderTextColor={night.textSecondary}
            multiline
            autoFocus
          />
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={[styles.cancelText, { color: night.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: night.primary }]}
              onPress={() => void handleSubmit()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={night.primaryContrast} />
              ) : (
                <Text style={[styles.buttonText, { color: night.primaryContrast }]}>
                  Save for morning
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
  },
  compactButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 44,
  },
  compactButtonText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    minHeight: 160,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 16,
  },
});
