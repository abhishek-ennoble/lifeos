import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
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

    const { message, history = [] } = await req.json();
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'message is required' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: entries } = await supabase
      .from('entries')
      .select('domain, title, priority, status, due_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(50);

    const contextMessages = (history as Array<{ role: string; content: string }>).map(
      (h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      }),
    );

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `You are LifeOS, a personal assistant. Answer based on the user's pending entries. Be concise and actionable.\n\nPending entries:\n${JSON.stringify(entries ?? [])}`,
        messages: [
          ...contextMessages,
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    const reply = result.content?.[0]?.text ?? 'I could not generate a response.';

    return jsonResponse({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return jsonResponse({ error: message }, 500);
  }
});
