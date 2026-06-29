import { corsHeaders, handleCors, jsonResponse, getUserId } from '../_shared/cors.ts';

const CLASSIFY_SYSTEM_PROMPT = `You are the AI router for a personal life management app called LifeOS.
Your job: read the user's input and extract structured data.

Domains:
- health: medicine, daily habits, recurring physical routines (guitar practice counts)
- task: actionable items, errands, one-time or recurring work (scooty repair, CCAF prep)
- learning: skills, courses, long-term knowledge goals (music theory, Python, spiritual learning)
- idea: conceptual seeds, product/business/personal ideas ("what if we build X")
- note: ephemeral context facts that expire (location of keys, temporary reminders)
- feedback: feedback about LifeOS itself — bugs, UX complaints, feature requests for the app
  (signals: "feedback on app", "the app should", "I can't see X", "app improvement")

Life areas (optional cross-cutting tag, NOT a domain):
- spiritual | creative | technical | family | finance
- Set "life_area" only when one clearly applies (e.g. guitar -> creative,
  Python/CCAF -> technical, sadhana -> spiritual, investments -> finance,
  a relative -> family). Otherwise set it to null.

Rules:
- If uncertain, prefer "task" over "note"
- "note" only for things with no action and very short life (under 48h)
- "feedback" only when the user is commenting on LifeOS the app (not general life ideas)
- Never output domain "journal" — that type is created manually by the user
- Extract recurrence_rule as cron string when a recurring pattern is detected
- Extract times as "HH:MM" in 24h format
- Set priority "high" for health/medicine, "medium" default, "low" for vague future items
- Include "life_area" (one of the five values above, or null)
- Always return valid JSON matching the schema. No prose, no explanation.
- If idea: set research_ready: false always (research is a future feature)

Return JSON with keys: domain, title, description, priority, is_recurring, recurrence_rule, metadata, life_area, expires_at, due_at, confidence`;

async function classifyWithClaude(rawInput: string): Promise<Record<string, unknown>> {
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
      max_tokens: 1024,
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawInput }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  const jsonText = extractFirstJsonObject(text);
  if (!jsonText) {
    throw new Error('Invalid classification response');
  }

  return JSON.parse(jsonText);
}

function buildFeedbackFastPath(rawInput: string): Record<string, unknown> | null {
  const trimmed = rawInput.trim();
  const match = /^fb:\s*/i.exec(trimmed);
  if (!match) {
    return null;
  }

  const body = trimmed.slice(match[0].length).trim();
  if (!body) {
    return null;
  }

  const firstLine = body.split('\n')[0]?.trim() ?? body;
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;

  return {
    domain: 'feedback',
    title,
    description: body,
    priority: 'medium',
    is_recurring: false,
    recurrence_rule: null,
    metadata: { theme: 'general' },
    life_area: null,
    expires_at: null,
    due_at: null,
    confidence: 1,
  };
}

// Pull the first complete, brace-balanced JSON object out of the model's reply.
// Handles markdown ```json fences and any prose/extra content the model appends
// after the object (a naive greedy `{...}` match breaks on trailing text).
function extractFirstJsonObject(raw: string): string | null {
  const text = raw.replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
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

    const userId = await getUserId(req);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { raw_input: rawInput } = await req.json();
    if (!rawInput || typeof rawInput !== 'string') {
      return jsonResponse({ error: 'raw_input is required' }, 400);
    }

    const fastPath = buildFeedbackFastPath(rawInput);
    const classified = fastPath ?? (await classifyWithClaude(rawInput));

    if (classified.domain === 'note' && !classified.expires_at) {
      const hours =
        (classified.metadata as { expires_in_hours?: number })?.expires_in_hours ?? 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);
      classified.expires_at = expiresAt.toISOString();
    }

    if (
      classified.domain === 'idea' &&
      classified.metadata &&
      typeof classified.metadata === 'object'
    ) {
      (classified.metadata as Record<string, unknown>).research_ready = false;
    }

    // Normalize life_area: only the five allowed values pass through; anything
    // else (including a model echoing "null") becomes null.
    const allowedLifeAreas = ['spiritual', 'creative', 'technical', 'family', 'finance'];
    const lifeArea = classified.life_area;
    classified.life_area =
      typeof lifeArea === 'string' && allowedLifeAreas.includes(lifeArea) ? lifeArea : null;

    return jsonResponse(classified);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Classification failed';
    return jsonResponse({ error: message }, 500);
  }
});
