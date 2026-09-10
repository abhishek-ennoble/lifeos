import { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChat } from '@/hooks/useChat';
import { useTheme } from '@/hooks/useTheme';

export default function ChatScreen() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { messages, loading, error, sendMessage } = useChat();
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  const [input, setInput] = useState(
    seed ? `I wrote this in my journal:\n\n"${seed}"\n\nHelp me reflect on it.` : '',
  );

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

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
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
      <FlatList
        ref={listRef}
        style={styles.flex}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 8 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
            Ask: &quot;What should I focus on today?&quot;{'\n\n'}
            Read-only for now — use Home capture to save tasks and reminders.
          </Text>
        }
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <View
        style={[
          styles.inputRow,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: Math.max(insets.bottom, 12),
          },
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
          onFocus={() => listRef.current?.scrollToEnd({ animated: true })}
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
  flex: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
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
    paddingHorizontal: 12,
    paddingTop: 12,
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
