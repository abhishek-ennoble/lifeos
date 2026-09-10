import { logAiUsage } from '../_shared/ai-usage.ts';
import { createServiceClient, requireUserId } from '../_shared/service-client.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const WHISPER_MODEL = 'whisper-1';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    let userId: string;
    try {
      userId = await requireUserId(req);
    } catch (response) {
      return response as Response;
    }

    const { audio_base64: audioBase64, filename = 'recording.m4a' } = await req.json();
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return jsonResponse({ error: 'audio_base64 is required' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'OPENAI_API_KEY not configured' }, 500);
    }

    const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    const formData = new FormData();
    formData.append('file', new Blob([binary]), filename);
    formData.append('model', WHISPER_MODEL);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();

    const supabase = createServiceClient();
    await logAiUsage(supabase, {
      userId,
      functionName: 'transcribe-audio',
      model: WHISPER_MODEL,
      inputTokens: 0,
      outputTokens: 0,
    });

    return jsonResponse({ text: result.text ?? '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return jsonResponse({ error: message }, 500);
  }
});
