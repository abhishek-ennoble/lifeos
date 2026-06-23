import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { useTheme } from '@/hooks/useTheme';

interface VoiceInputProps {
  onTranscribed: (text: string) => Promise<void>;
  /** 'inline' = labelled pill button; 'fab' = dominant floating mic button. */
  variant?: 'inline' | 'fab';
}

// Voice capture is temporarily disabled while we migrate off the deprecated
// expo-av module to expo-audio. The button stays visible but is a no-op for now.
export function VoiceInput({ variant = 'inline' }: VoiceInputProps) {
  const { colors, radius } = useTheme();

  const onPress = () => {
    Toast.show({ type: 'info', text1: 'Voice capture coming soon', text2: 'Use text capture for now' });
  };

  const loading = false;

  if (variant === 'fab') {
    return (
      <Pressable
        accessibilityLabel="Capture by voice"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={onPress}>
        <Text style={[styles.fabIcon, { color: colors.primaryContrast }]}>🎤</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.micButton,
          { backgroundColor: colors.primary, borderRadius: radius.pill },
        ]}
        onPress={onPress}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.micText, { color: colors.primaryContrast }]}>🎤 Hold to speak</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  micButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  micText: {
    fontWeight: '600',
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
  },
});
