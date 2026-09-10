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
import {
  describeNow,
  localDateString,
  resolveNow,
  resolveTimezone,
  zonedStartOfDay,
} from '../_shared/temporal.ts';

const BRIEFING_MODEL = 'claude-haiku-4-5-20251001';

// Short-first (F21): the first paragraph must stand alone above the fold on a
// phone; the rest is optional depth the user can expand.
const BRIEFING_PROMPT = `You are generating a personal morning briefing.
Tone: warm, direct, like a thoughtful friend who knows everything going on.
Witness, not judge: describe what is there ("this has waited 3 weeks"), never scold.
Shape: paragraph 1 = at most 45 words, the 1–2 things that matter most today, complete on its own.
Then a blank line, then at most 100 more words of context. No headers, no bullet points, no markdown.
"overdue" means a deadline has passed. Items with start_at are practices beginning — they are not overdue.
Prioritize ruthlessly. Be human.`;

async function generateBriefing(
  data: Record<string, unknown>,
  memorySummary: string,
  temporalBlock: string,
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
      system: `${appendMemoryToSystem(BRIEFING_PROMPT, memorySummary)}\n\n${temporalBlock}`,
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

  const text = result.content?.[0]?.text;
  return typeof text === 'string' && text.trim() ? stripMarkdown(text) : 'Good morning. Ready for today.';
}

/**
 * The briefing is rendered as plain text on the phone, so markdown shows up
 * as literal `#` and `**`. The prompt forbids it; this makes it impossible.
 */
export function stripMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/^\s*[-*•]\s+/, ''))
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

    // "Today" is the user's calendar day, not the server's UTC day.
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const nowDate = resolveNow(body?.client_now);
    const timezone = resolveTimezone(body?.timezone);
    const today = localDateString(nowDate, timezone);
    const now = nowDate.toISOString();

    const { data: entries } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    const pending = entries ?? [];
    // A practice with start_at is beginning, not late — never count it overdue.
    const overdue = pending.filter((e) => e.due_at && e.due_at < now);
    const starting = pending.filter((e) => {
      const startAt = (e.metadata as { start_at?: unknown } | null)?.start_at;
      return typeof startAt === 'string' && startAt.slice(0, 10) >= today;
    });
    const highPriority = pending.filter((e) => e.priority === 'high').slice(0, 3);

    // Today's window in the user's zone: [local midnight, +24h) expressed in UTC.
    const windowStart = zonedStartOfDay(today, timezone);
    const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('fire_at', windowStart.toISOString())
      .lt('fire_at', windowEnd.toISOString());

    const [memorySummary, profileContext] = await Promise.all([
      fetchMemorySummary(supabase, userId),
      fetchProfileContext(supabase, userId),
    ]);

    const briefingData = {
      overdue,
      starting_soon: starting,
      today_reminders: reminders ?? [],
      high_priority: highPriority,
      learning_due: pending.filter((e) => e.domain === 'learning'),
    };

    const content = await generateBriefing(
      briefingData,
      `${profileContext}${memorySummary}`,
      describeNow(nowDate, timezone),
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
