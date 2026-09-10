import { corsHeaders, handleCors, jsonResponse, getUserId } from '../_shared/cors.ts';
import { logAiUsage, usageFromAnthropicResponse } from '../_shared/ai-usage.ts';
import { appendMemoryToSystem, fetchMemorySummary } from '../_shared/memory.ts';
import { createServiceClient } from '../_shared/service-client.ts';

const CLASSIFY_MODEL = 'claude-haiku-4-5-20251001';

const ITEM_SCHEMA = `Each item object has keys: domain, title, description, priority, is_recurring, recurrence_rule, metadata, life_area, expires_at, due_at, confidence`;

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
- Reminder intent: when user asks to be reminded, set metadata fields:
  - reminder_in_minutes (integer) for "in X minutes/hours" (convert hours to minutes)
  - remind_at (ISO8601) for "remind me at 3pm tomorrow" or specific datetime
  - wants_reminder (true) when remind intent exists; also set due_at when a deadline is given
- Reminder + content → domain MUST be "task" with a specific title (subject of the reminder), NOT "note"
- Bare "remind me in X" with no subject → still "task", title like "Reminder: {short snippet from input}"
- Never use generic title "Reminder" alone — always include context from the input
- Set priority "high" for health/medicine, "medium" default, "low" for vague future items
- Include "life_area" (one of the five values above, or null)
- Always return valid JSON. No prose, no explanation.
- If idea: set research_ready: false always (research is a future feature)
- If idea: set metadata.thread to a short project label when the input names a recurring theme (e.g. "LifeOS agents", "MedTracker"); omit if none

Multi-item input:
- When the user lists multiple distinct items (numbered list, "and also", "plus", several ideas/tasks in one message), return JSON: { "items": [ ... ] } with up to 5 items.
- Each item is independent with its own domain, title, and metadata.
- When only one item, still return { "items": [ single item ] }.
${ITEM_SCHEMA}`;

async function classifyWithClaude(
  rawInput: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const supabase = createServiceClient();
  const memorySummary = await fetchMemorySummary(supabase, userId);
  const system = appendMemoryToSystem(CLASSIFY_SYSTEM_PROMPT, memorySummary);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLASSIFY_MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: rawInput }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${errText}`);
  }

  const data = await response.json();
  const usage = usageFromAnthropicResponse(data as Record<string, unknown>);
  await logAiUsage(supabase, {
    userId,
    functionName: 'classify-entry',
    model: CLASSIFY_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });

  const text = data.content?.[0]?.text ?? '';

  const jsonText = extractFirstJsonObject(text);
  if (!jsonText) {
    throw new Error('Invalid classification response');
  }

  return JSON.parse(jsonText);
}

function buildIdeaFastPath(rawInput: string): Record<string, unknown> | null {
  const trimmed = rawInput.trim();
  const prefixMatch = /^idea:\s*/i.exec(trimmed);
  if (!prefixMatch) {
    return null;
  }

  const afterPrefix = trimmed.slice(prefixMatch[0].length).trim();
  if (!afterPrefix) {
    return null;
  }

  let thread: string;
  let body: string;

  const dashSplit = afterPrefix.match(/^([^-\n]+?)\s*[-–—]\s*([\s\S]+)$/);
  if (dashSplit) {
    thread = dashSplit[1].trim();
    body = dashSplit[2].trim();
  } else {
    const lines = afterPrefix.split('\n');
    thread = lines[0]?.trim() ?? '';
    body = lines.slice(1).join('\n').trim();
    if (!body) {
      body = thread;
      thread = 'General';
    }
  }

  const firstLine = body.split('\n')[0]?.trim() ?? body;
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;

  return {
    items: [
      {
        domain: 'idea',
        title,
        description: body,
        priority: 'medium',
        is_recurring: false,
        recurrence_rule: null,
        metadata: { tag: 'personal', research_ready: false, thread },
        life_area: null,
        expires_at: null,
        due_at: null,
        confidence: 1,
      },
    ],
  };
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
    items: [
      {
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
      },
    ],
  };
}

function hasReminderIntent(item: Record<string, unknown>): boolean {
  const meta =
    item.metadata && typeof item.metadata === 'object'
      ? (item.metadata as Record<string, unknown>)
      : {};
  return (
    (typeof meta.reminder_in_minutes === 'number' && meta.reminder_in_minutes > 0) ||
    typeof meta.remind_at === 'string' ||
    meta.wants_reminder === true
  );
}

function normalizeReminderItem(item: Record<string, unknown>, rawInput: string): void {
  if (!hasReminderIntent(item)) {
    return;
  }

  if (item.domain === 'note') {
    item.domain = 'task';
  }

  const title = String(item.title ?? '').trim();
  if (!title || title.toLowerCase() === 'reminder') {
    const snippet = rawInput.trim().replace(/\s+/g, ' ').slice(0, 80);
    item.title = snippet ? `Reminder: ${snippet}` : 'Reminder: follow up';
  }

  item.expires_at = null;
}

function normalizeClassifiedItem(
  item: Record<string, unknown>,
  rawInput: string,
): Record<string, unknown> {
  normalizeReminderItem(item, rawInput);

  if (item.domain === 'note' && !item.expires_at) {
    const hours =
      (item.metadata as { expires_in_hours?: number })?.expires_in_hours ?? 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    item.expires_at = expiresAt.toISOString();
  }

  if (item.domain === 'idea' && item.metadata && typeof item.metadata === 'object') {
    const meta = item.metadata as Record<string, unknown>;
    meta.research_ready = false;
    if (typeof meta.thread === 'string') {
      const trimmed = meta.thread.trim();
      if (trimmed) {
        meta.thread = trimmed;
      } else {
        delete meta.thread;
      }
    }
  }

  const allowedLifeAreas = ['spiritual', 'creative', 'technical', 'family', 'finance'];
  const lifeArea = item.life_area;
  item.life_area =
    typeof lifeArea === 'string' && allowedLifeAreas.includes(lifeArea) ? lifeArea : null;

  return item;
}

function extractItems(parsed: Record<string, unknown>, rawInput: string): Record<string, unknown>[] {
  if (Array.isArray(parsed.items) && parsed.items.length > 0) {
    return parsed.items
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .slice(0, 5)
      .map((item) => normalizeClassifiedItem(item, rawInput));
  }

  if (parsed.domain) {
    return [normalizeClassifiedItem(parsed, rawInput)];
  }

  throw new Error('Invalid classification response');
}

// Pull the first complete, brace-balanced JSON object out of the model's reply.
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

    const fastPath = buildFeedbackFastPath(rawInput) ?? buildIdeaFastPath(rawInput);
    const parsed = fastPath ?? (await classifyWithClaude(rawInput, userId));
    const items = extractItems(parsed, rawInput);

    return jsonResponse({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Classification failed';
    return jsonResponse({ error: message }, 500);
  }
});
