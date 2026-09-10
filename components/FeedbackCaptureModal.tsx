import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';

import { VoiceInput } from '@/components/VoiceInput';
import { useTheme } from '@/hooks/useTheme';
import type { CaptureResult } from '@/types/capture';

const FEEDBACK_PREFIX = 'fb: ';

interface FeedbackCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<CaptureResult | void | null | unknown>;
}

export function FeedbackCaptureModal({ visible, onClose, onSubmit }: FeedbackCaptureModalProps) {
  const { colors, radius } = useTheme();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(FEEDBACK_PREFIX);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === 'fb:' || loading) {
      return;
    }

    const payload = trimmed.toLowerCase().startsWith('fb:') ? trimmed : `${FEEDBACK_PREFIX}${trimmed}`;

    setLoading(true);
    try {
      await onSubmit(payload);
      setText('');
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Thanks',
        text2: 'Logged as app feedback',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save feedback';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardProvider>
        <KeyboardAvoidingView style={styles.overlay} behavior="padding">
          <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>App feedback</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              What should LifeOS do better? Bugs, UX, missing features — this stays in your feedback
              list, not the inbox.
            </Text>

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
              placeholder="The app should…"
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
            />

            <View style={styles.voiceRow}>
              <VoiceInput
                variant="inline"
                onDraft={(transcript) => {
                  setText((prev) => {
                    const base = prev.trim() === 'fb:' ? FEEDBACK_PREFIX : prev;
                    return base.trim().endsWith(FEEDBACK_PREFIX.trim())
                      ? `${base}${transcript}`
                      : `${base.trim()}\n${transcript}`;
                  });
                }}
                onTranscribed={async () => null}
              />
            </View>

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.save, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                onPress={() => void handleSubmit()}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.primaryContrast} />
                ) : (
                  <Text style={[styles.saveText, { color: colors.primaryContrast }]}>Send feedback</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
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
    minHeight: '45%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  voiceRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
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
