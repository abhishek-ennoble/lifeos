import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { useEntries } from '@/hooks/useEntries';
import { useTheme } from '@/hooks/useTheme';

const PROMPTS = [
  {
    key: 'highlight' as const,
    label: 'One highlight',
    placeholder: 'A moment that stood out today…',
  },
  {
    key: 'gratitude' as const,
    label: 'One thing you\u2019re grateful for',
    placeholder: 'However small…',
  },
  {
    key: 'anchor' as const,
    label: "Tomorrow\u2019s one anchor",
    placeholder: 'The single thing that would make tomorrow good…',
  },
];

export default function ReflectScreen() {
  const { colors, typography, radius } = useTheme();
  const router = useRouter();
  const { captureJournal } = useEntries();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setValue = (key: string, text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
  };

  const handleSave = async () => {
    const highlight = values.highlight?.trim();
    const gratitude = values.gratitude?.trim();
    const anchor = values.anchor?.trim();

    if (!highlight && !gratitude && !anchor) {
      router.back();
      return;
    }

    const composed = [
      highlight ? `Highlight: ${highlight}` : null,
      gratitude ? `Grateful for: ${gratitude}` : null,
      anchor ? `Tomorrow's anchor: ${anchor}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    setLoading(true);
    try {
      await captureJournal({
        text: composed,
        highlight: highlight || undefined,
        gratitude: gratitude || undefined,
        tomorrowAnchor: anchor || undefined,
      });
      Toast.show({ type: 'success', text1: 'Reflection saved' });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <Text style={[typography.display, { color: colors.textPrimary }]}>Evening reflection</Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Two minutes to close the day gently. Answer what you like — skip the rest.
        </Text>

        {PROMPTS.map((prompt) => (
        <View key={prompt.key} style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{prompt.label}</Text>
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
            value={values[prompt.key] ?? ''}
            onChangeText={(text) => setValue(prompt.key, text)}
            placeholder={prompt.placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </View>
      ))}

      <Pressable
        style={[styles.save, { backgroundColor: colors.primary, borderRadius: radius.md }]}
        onPress={() => void handleSave()}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.saveText, { color: colors.primaryContrast }]}>Save reflection</Text>
        )}
      </Pressable>

        <Pressable style={styles.skip} onPress={() => router.back()}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for tonight</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
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
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    minHeight: 72,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  save: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
  },
});
