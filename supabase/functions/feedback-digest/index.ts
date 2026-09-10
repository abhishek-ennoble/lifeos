import {
  logAiUsage,
  usageFromAnthropicResponse,
} from '../_shared/ai-usage.ts';
import { createUserScopedClient } from '../_shared/service-client.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const DIGEST_MODEL = 'claude-haiku-4-5-20251001';

const DIGEST_PROMPT = `You are helping prioritize app-improvement feedback for LifeOS, a personal life OS mobile app.

Given JSON feedback items (title, body, theme, status, created_at), produce a concise Markdown backlog for the developer.

Structure:
1. One short executive summary (2-3 sentences).
2. **Themes** — cluster similar items; note duplicates.
3. **Top 5 to build next** — ordered list with one-line rationale each (severity × frequency × recency).
4. **Quick wins** — items shippable in under a day.
5. **Defer** — items that can wait.

Be ruthless. No fluff. Markdown only.`;

async function generateDigest(
  items: Record<string, unknown>[],
  userId: string,
  supabase: Awaited<ReturnType<typeof createUserScopedClient>>['supabase'],
): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: DIGEST_MODEL,
      max_tokens: 2048,
      system: DIGEST_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Feedback items (${items.length}):\n${JSON.stringify(items, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const result = await response.json();
  const usage = usageFromAnthropicResponse(result as Record<string, unknown>);
  await logAiUsage(supabase, {
    userId,
    functionName: 'feedback-digest',
    model: DIGEST_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });

  return result.content?.[0]?.text ?? 'No digest generated.';
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    let supabase: Awaited<ReturnType<typeof createUserScopedClient>>['supabase'];
    let userId: string;
    try {
      const scoped = await createUserScopedClient(req);
      supabase = scoped.supabase;
      userId = scoped.userId;
    } catch (response) {
      return response as Response;
    }

    const { data: feedbackRows, error: fetchError } = await supabase
      .from('app_feedback')
      .select('id, title, body, theme, status, created_at')
      .eq('user_id', userId)
      .in('status', ['new', 'triaged'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    const items = feedbackRows ?? [];
    if (items.length === 0) {
      return jsonResponse({
        content: 'No open feedback items (new or triaged). Capture app feedback with **fb:** first.',
        item_count: 0,
        generated_at: new Date().toISOString(),
      });
    }

    const content = await generateDigest(items as Record<string, unknown>[], userId, supabase);

    const { data: inserted, error: insertError } = await supabase
      .from('feedback_digests')
      .insert({
        user_id: userId,
        content,
        item_count: items.length,
      })
      .select('id, content, item_count, generated_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    return jsonResponse(inserted);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Digest failed';
    return jsonResponse({ error: message }, 500);
  }
});
