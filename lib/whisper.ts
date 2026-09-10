import { File } from 'expo-file-system';

import { invokeFunction } from '@/lib/supabase';

interface TranscribeResponse {
  text?: string;
  error?: string;
}

function filenameFromUri(uri: string): string {
  const last = uri.split('/').pop() ?? 'recording.m4a';
  return last.includes('.') ? last : 'recording.m4a';
}

async function deleteRecording(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if ('delete' in file && typeof file.delete === 'function') {
      await (file as File & { delete: () => Promise<void> }).delete();
    }
  } catch {
    // Cache files may be removed by the OS; ignore cleanup failures.
  }
}

export async function transcribeAudio(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    const base64 = await file.base64();
    const filename = filenameFromUri(uri);

    const response = await invokeFunction<TranscribeResponse>('transcribe-audio', {
      audio_base64: base64,
      filename,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.text) {
      throw new Error('No transcription returned');
    }

    return response.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    throw new Error(message);
  } finally {
    await deleteRecording(uri);
  }
}
