import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors, jsonResponse, getUserId } from '../_shared/cors.ts';

const BRIEFING_PROMPT = `You are generating a personal morning briefing.
Tone: warm, direct, like a thoughtful friend who knows everything going on.
Length: 150-200 words maximum. No headers. Flowing prose.
Prioritize ruthlessly. Be human.`;

async function generateBriefing(data: Record<string, unknown>): Promise<string> {
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: BRIEFING_PROMPT,
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
  return result.content?.[0]?.text ?? 'Good morning. Ready for today.';
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const userId = await getUserId(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const targetUserId = userId;
    if (!targetUserId && !serviceKey) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const effectiveUserId = targetUserId;
    if (!effectiveUserId) {
      return jsonResponse({ error: 'User context required' }, 401);
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    const { data: entries } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('status', 'pending');

    const overdue = (entries ?? []).filter(
      (e) => e.due_at && e.due_at < now,
    );
    const highPriority = (entries ?? [])
      .filter((e) => e.priority === 'high')
      .slice(0, 3);

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', effectiveUserId)
      .gte('fire_at', `${today}T00:00:00`)
      .lte('fire_at', `${today}T23:59:59`);

    const briefingData = {
      overdue,
      today_reminders: reminders ?? [],
      high_priority: highPriority,
      learning_due: (entries ?? []).filter((e) => e.domain === 'learning'),
    };

    const content = await generateBriefing(briefingData);

    const { data: briefing, error } = await supabase
      .from('briefings')
      .upsert(
        {
          user_id: effectiveUserId,
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
