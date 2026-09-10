import { logAiUsage, usageFromAnthropicResponse } from '../_shared/ai-usage.ts';
import {
  appendMemoryToSystem,
  fetchMemorySummary,
  fetchProfileContext,
} from '../_shared/memory.ts';
import { createServiceClient, requireUserId } from '../_shared/service-client.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const CHAT_MODEL = 'claude-sonnet-4-6';

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

    const { message, history = [] } = await req.json();
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'message is required' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    const supabase = createServiceClient();

    const { data: entries } = await supabase
      .from('entries')
      .select('domain, title, priority, status, due_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(50);

    const [memorySummary, profileContext] = await Promise.all([
      fetchMemorySummary(supabase, userId),
      fetchProfileContext(supabase, userId),
    ]);

    const contextMessages = (history as Array<{ role: string; content: string }>).map(
      (h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      }),
    );

    const system = appendMemoryToSystem(
      `You are LifeOS, a personal assistant. Answer based on the user's pending entries. Be concise and actionable.\n\nPending entries:\n${JSON.stringify(entries ?? [])}`,
      `${profileContext}${memorySummary}`,
    );

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: 1024,
        system,
        messages: [...contextMessages, { role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    const usage = usageFromAnthropicResponse(result as Record<string, unknown>);
    await logAiUsage(supabase, {
      userId,
      functionName: 'ai-chat',
      model: CHAT_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });

    const reply = result.content?.[0]?.text ?? 'I could not generate a response.';

    return jsonResponse({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return jsonResponse({ error: message }, 500);
  }
});
