import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';

import { useTheme } from '@/hooks/useTheme';
import { transcribeAudio } from '@/lib/whisper';

interface VoiceInputProps {
  onTranscribed: (text: string) => Promise<void>;
  /** 'inline' = labelled pill button; 'fab' = dominant floating mic button. */
  variant?: 'inline' | 'fab';
}

export function VoiceInput({ onTranscribed, variant = 'inline' }: VoiceInputProps) {
  const { colors, radius } = useTheme();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Microphone permission required' });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(newRecording);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start recording';
      Toast.show({ type: 'error', text1: 'Recording error', text2: message });
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      return;
    }

    setLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI');
      }

      const text = await transcribeAudio(uri);
      await onTranscribed(text);
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Transcribed and routed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice capture failed';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setLoading(false);
    }
  };

  const isRecording = recording !== null;
  const onPress = isRecording ? () => void stopRecording() : () => void startRecording();

  if (variant === 'fab') {
    return (
      <Pressable
        accessibilityLabel={isRecording ? 'Stop recording' : 'Capture by voice'}
        style={[
          styles.fab,
          { backgroundColor: isRecording ? colors.danger : colors.primary },
        ]}
        onPress={onPress}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.fabIcon, { color: colors.primaryContrast }]}>
            {isRecording ? '■' : '🎤'}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.micButton,
          { backgroundColor: isRecording ? colors.danger : colors.primary, borderRadius: radius.pill },
        ]}
        onPress={onPress}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.micText, { color: colors.primaryContrast }]}>
            {isRecording ? '■ Stop' : '🎤 Hold to speak'}
          </Text>
        )}
      </Pressable>
      {isRecording ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Listening… tap to stop and transcribe
        </Text>
      ) : null}
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
