import { File } from 'expo-file-system';

import { invokeFunction } from '@/lib/supabase';

interface TranscribeResponse {
  text: string;
}

export async function transcribeAudio(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    const base64 = await file.base64();

    const response = await invokeFunction<TranscribeResponse>('transcribe-audio', {
      audio_base64: base64,
      filename: 'recording.m4a',
    });

    return response.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    throw new Error(message);
  }
}
