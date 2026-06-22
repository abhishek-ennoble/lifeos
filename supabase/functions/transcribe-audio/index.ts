import { handleCors, jsonResponse, getUserId } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const userId = await getUserId(req);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
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
    formData.append('model', 'whisper-1');

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
    return jsonResponse({ text: result.text ?? '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return jsonResponse({ error: message }, 500);
  }
});
