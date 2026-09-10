import {
  appendMemoryToSystem,
  fetchMemorySummary,
} from '../_shared/memory.ts';
import {
  logAiUsage,
  usageFromAnthropicResponse,
} from '../_shared/ai-usage.ts';
import { createUserScopedClient } from '../_shared/service-client.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const SCAN_PROMPT = `You detect app-improvement feedback inside personal journal entries for LifeOS (a mobile life OS app).

LifeOS feedback = comments about the app itself: bugs, UX friction, missing features, "the app should…", "LifeOS needs…".
NOT feedback = general life reflections, tasks, ideas unrelated to the app.

Return JSON only:
{
  "has_feedback": boolean,
  "title": "short title if has_feedback",
  "body": "extracted feedback text if has_feedback",
  "theme": "ux" | "bugs" | "features" | "general"
}

If no app feedback, return { "has_feedback": false }.`;

function extractJson(raw: string): Record<string, unknown> | null {
  const text = raw.replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
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

    const { supabase, userId } = await createUserScopedClient(req);
    const { journal_text: journalText, entry_id: entryId } = await req.json();

    if (!journalText || typeof journalText !== 'string') {
      return jsonResponse({ error: 'journal_text is required' }, 400);
    }
    if (!entryId || typeof entryId !== 'string') {
      return jsonResponse({ error: 'entry_id is required' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    const memorySummary = await fetchMemorySummary(supabase, userId);
    const model = 'claude-haiku-4-5-20251001';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: appendMemoryToSystem(SCAN_PROMPT, memorySummary),
        messages: [{ role: 'user', content: journalText }],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    const usage = usageFromAnthropicResponse(result as Record<string, unknown>);
    await logAiUsage(supabase, {
      userId,
      functionName: 'scan-journal-feedback',
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });

    const text = result.content?.[0]?.text ?? '';
    const parsed = extractJson(text);

    if (!parsed?.has_feedback) {
      return jsonResponse({ detected: false });
    }

    const title = String(parsed.title ?? 'Journal app feedback').slice(0, 120);
    const body = String(parsed.body ?? journalText);
    const theme = typeof parsed.theme === 'string' ? parsed.theme : 'general';

    const { data: inserted, error: insertError } = await supabase
      .from('app_feedback')
      .insert({
        user_id: userId,
        title,
        body,
        theme,
        source: 'journal',
        source_entry_id: entryId,
        status: 'new',
      })
      .select('id, title')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return jsonResponse({ detected: false, duplicate: true });
      }
      throw insertError;
    }

    return jsonResponse({ detected: true, feedback: inserted });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Scan failed';
    return jsonResponse({ error: message }, 500);
  }
});
