import {
  logAiUsage,
  usageFromAnthropicResponse,
} from '../_shared/ai-usage.ts';
import {
  appendMemoryToSystem,
  fetchMemorySummary,
  fetchProfileContext,
} from '../_shared/memory.ts';
import { createUserScopedClient } from '../_shared/service-client.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

const BRIEFING_MODEL = 'claude-haiku-4-5-20251001';

const BRIEFING_PROMPT = `You are generating a personal morning briefing.
Tone: warm, direct, like a thoughtful friend who knows everything going on.
Length: 150-200 words maximum. No headers. Flowing prose.
Prioritize ruthlessly. Be human.`;

async function generateBriefing(
  data: Record<string, unknown>,
  memorySummary: string,
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
      model: BRIEFING_MODEL,
      max_tokens: 512,
      system: appendMemoryToSystem(BRIEFING_PROMPT, memorySummary),
      messages: [
        {
          role: 'user',
          content: `Generate today's briefing from this data:\n${JSON.stringify(data)}`,
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
    functionName: 'morning-briefing',
    model: BRIEFING_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });

  return result.content?.[0]?.text ?? 'Good morning. Ready for today.';
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    let supabase: Awaited<ReturnType<typeof createUserScopedClient>>['supabase'];
    let userId: string;
    try {
      const scoped = await createUserScopedClient(req);
      supabase = scoped.supabase;
      userId = scoped.userId;
    } catch (response) {
      return response as Response;
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    const { data: entries } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    const overdue = (entries ?? []).filter((e) => e.due_at && e.due_at < now);
    const highPriority = (entries ?? [])
      .filter((e) => e.priority === 'high')
      .slice(0, 3);

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('fire_at', `${today}T00:00:00`)
      .lte('fire_at', `${today}T23:59:59`);

    const [memorySummary, profileContext] = await Promise.all([
      fetchMemorySummary(supabase, userId),
      fetchProfileContext(supabase, userId),
    ]);

    const briefingData = {
      overdue,
      today_reminders: reminders ?? [],
      high_priority: highPriority,
      learning_due: (entries ?? []).filter((e) => e.domain === 'learning'),
    };

    const content = await generateBriefing(
      briefingData,
      `${profileContext}${memorySummary}`,
      userId,
      supabase,
    );

    const { data: briefing, error } = await supabase
      .from('briefings')
      .upsert(
        {
          user_id: userId,
          content,
          date: today,
          generated_at: now,
        },
        { onConflict: 'user_id,date' },
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return jsonResponse({ content: briefing.content, date: briefing.date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Briefing failed';
    return jsonResponse({ error: message }, 500);
  }
});
