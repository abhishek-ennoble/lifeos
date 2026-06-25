import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams } from 'expo-router';

import { useChat } from '@/hooks/useChat';
import { useTheme } from '@/hooks/useTheme';

export default function ChatScreen() {
  const { colors, radius } = useTheme();
  const { messages, loading, error, sendMessage } = useChat();
  // When opened from a journal entry ("Discuss with AI"), seed the input with
  // the entry text so the conversation has it as context.
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  const [input, setInput] = useState(
    seed ? `I wrote this in my journal:\n\n"${seed}"\n\nHelp me reflect on it.` : '',
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }
    setInput('');
    await sendMessage(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <FlatList
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.bubble,
                isUser
                  ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
              ]}>
              <Text
                style={[
                  styles.bubbleText,
                  { color: isUser ? colors.primaryContrast : colors.textPrimary },
                ]}>
                {item.content}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Ask: &quot;What should I focus on today?&quot;
          </Text>
        }
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <View
        style={[
          styles.inputRow,
          { borderTopColor: colors.border, backgroundColor: colors.surface },
        ]}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.bg, color: colors.textPrimary, borderRadius: radius.md },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask LifeOS..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => void handleSend()}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primaryContrast} size="small" />
          ) : (
            <Text style={[styles.sendText, { color: colors.primaryContrast }]}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  error: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 44,
  },
  sendText: {
    fontWeight: '600',
  },
});
