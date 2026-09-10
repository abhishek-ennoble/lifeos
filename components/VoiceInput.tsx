import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import Toast from 'react-native-toast-message';

import { useTheme } from '@/hooks/useTheme';
import { showCaptureSuccessToast } from '@/lib/capture-toast';
import { transcribeAudio } from '@/lib/whisper';
import type { CaptureResult } from '@/types/capture';

const MIN_RECORD_MS = 400;
const MAX_RECORD_MS = 3 * 60 * 1000;

interface VoiceInputProps {
  onTranscribed: (text: string) => Promise<CaptureResult | void | null | unknown>;
  /** 'inline' = labelled pill button; 'fab' = dominant floating mic button. */
  variant?: 'inline' | 'fab';
  /** Override success toast after capture (e.g. brain dump). */
  successToast?: { text1: string; text2: string; brainDump?: boolean };
  /** When set, transcript is appended to draft instead of calling onTranscribed (journal compose). */
  onDraft?: (text: string) => void;
}

async function ensureMicReady(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) {
    return false;
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });

  return true;
}

function showCaptureToast(
  result: CaptureResult | void | null | unknown,
  fallback: VoiceInputProps['successToast'],
) {
  if (fallback?.brainDump) {
    showCaptureSuccessToast(result, { brainDump: true });
    return;
  }
  showCaptureSuccessToast(result);
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function VoiceInput({
  variant = 'inline',
  onTranscribed,
  successToast,
  onDraft,
}: VoiceInputProps) {
  const { colors, radius } = useTheme();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [transcribing, setTranscribing] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const recordStartedAt = useRef<number | null>(null);
  const busyRef = useRef(false);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void (async () => {
      try {
        const ready = await ensureMicReady();
        setMicReady(ready);
      } catch {
        setMicReady(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!recorderState.isRecording || recordStartedAt.current === null) {
      setElapsedMs(0);
      return;
    }

    const tick = setInterval(() => {
      setElapsedMs(Date.now() - (recordStartedAt.current ?? Date.now()));
    }, 500);

    return () => clearInterval(tick);
  }, [recorderState.isRecording]);

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    if (busyRef.current || transcribing) {
      return;
    }

    const startedAt = recordStartedAt.current;
    const liveStatus = audioRecorder.getStatus();
    if (startedAt === null && !liveStatus.isRecording) {
      return;
    }

    clearMaxTimer();
    recordStartedAt.current = null;
    busyRef.current = true;
    setTranscribing(true);

    try {
      if (liveStatus.isRecording) {
        await audioRecorder.stop();
      }

      const durationMs = Date.now() - (startedAt ?? Date.now());
      if (durationMs < MIN_RECORD_MS) {
        Toast.show({
          type: 'info',
          text1: 'Too short',
          text2: 'Tap the mic and speak a little longer',
        });
        return;
      }

      const uri = audioRecorder.uri ?? audioRecorder.getStatus().url;
      if (!uri) {
        Toast.show({
          type: 'error',
          text1: 'No recording',
          text2: 'Try recording again',
        });
        return;
      }

      const transcript = (await transcribeAudio(uri)).trim();
      if (!transcript) {
        Toast.show({
          type: 'info',
          text1: 'No speech detected',
          text2: 'Try speaking clearly near the mic',
        });
        return;
      }

      if (onDraft) {
        onDraft(transcript);
        Toast.show({ type: 'success', text1: 'Added', text2: 'Voice added to your draft' });
        return;
      }

      const result = await onTranscribed(transcript);
      showCaptureToast(result, successToast);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed';
      Toast.show({ type: 'error', text1: 'Voice capture failed', text2: message });
    } finally {
      setTranscribing(false);
      busyRef.current = false;
      setElapsedMs(0);
      try {
        if (!audioRecorder.getStatus().canRecord) {
          await audioRecorder.prepareToRecordAsync();
        }
      } catch {
        // Next tap will retry prepare.
      }
    }
  }, [audioRecorder, clearMaxTimer, onDraft, onTranscribed, successToast, transcribing]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      Toast.show({
        type: 'info',
        text1: 'Voice on mobile',
        text2: 'Use the Android app to capture by voice',
      });
      return;
    }

    if (busyRef.current || transcribing || recorderState.isRecording) {
      return;
    }

    busyRef.current = true;
    try {
      const ready = micReady || (await ensureMicReady());
      if (!ready) {
        Toast.show({
          type: 'error',
          text1: 'Microphone blocked',
          text2: 'Enable mic permission in Settings',
        });
        return;
      }

      if (!micReady) {
        setMicReady(true);
      }

      if (!audioRecorder.getStatus().canRecord) {
        await audioRecorder.prepareToRecordAsync();
      }
      audioRecorder.record();
      recordStartedAt.current = Date.now();

      clearMaxTimer();
      maxTimerRef.current = setTimeout(() => {
        Toast.show({
          type: 'info',
          text1: 'Time limit reached',
          text2: 'Saving what you recorded (3 min max)',
        });
        void stopAndTranscribe();
      }, MAX_RECORD_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start recording';
      Toast.show({ type: 'error', text1: 'Recording failed', text2: message });
    } finally {
      busyRef.current = false;
    }
  }, [
    audioRecorder,
    clearMaxTimer,
    micReady,
    recorderState.isRecording,
    stopAndTranscribe,
    transcribing,
  ]);

  const toggleRecording = useCallback(() => {
    if (transcribing) {
      return;
    }
    if (recorderState.isRecording) {
      void stopAndTranscribe();
    } else {
      void startRecording();
    }
  }, [recorderState.isRecording, startRecording, stopAndTranscribe, transcribing]);

  useEffect(() => {
    return () => clearMaxTimer();
  }, [clearMaxTimer]);

  const loading = transcribing;
  const recording = recorderState.isRecording;

  const micHandlers = {
    onPress: () => toggleRecording(),
    disabled: loading,
  };

  if (variant === 'fab') {
    return (
      <Pressable
        accessibilityLabel="Capture by voice"
        accessibilityHint="Tap to start recording, tap again to send"
        style={[
          styles.fab,
          { backgroundColor: recording ? colors.domain.health : colors.primary },
        ]}
        {...micHandlers}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.fabIcon, { color: colors.primaryContrast }]}>
            {recording ? '■' : '🎤'}
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
          {
            backgroundColor: recording ? colors.domain.health : colors.primary,
            borderRadius: radius.pill,
          },
        ]}
        {...micHandlers}>
        {loading ? (
          <ActivityIndicator color={colors.primaryContrast} />
        ) : (
          <Text style={[styles.micText, { color: colors.primaryContrast }]}>
            {recording ? `■ Tap to send (${formatElapsed(elapsedMs)})` : '🎤 Tap to speak'}
          </Text>
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
