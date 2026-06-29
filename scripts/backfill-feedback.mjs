// One-time backfill: scan existing entries for buried app-improvement feedback
// and insert into app_feedback with source='backfill'.
//
// Usage: node scripts/backfill-feedback.mjs
// Requires in .env (gitignored):
//   EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
//
// NOTE: service-role bypasses RLS. Local-only, never bundled.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const TARGET_EMAIL = 'abhshk.0308@gmail.com';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const ROOT = process.cwd();

const ANALYSIS_PROMPT = `You analyze entries from a personal app called LifeOS.
Identify which entries are app-improvement feedback about LifeOS itself (bugs, UX issues,
feature requests, complaints about the app not working), NOT general life tasks/ideas.

Return ONLY valid JSON array. Each item:
{
  "entry_id": "<uuid from input>",
  "is_feedback": true|false,
  "title": "short summary if is_feedback",
  "body": "full feedback text if is_feedback",
  "theme": "one of: agents|customization|capture|reminders|ux|other"
}

If not feedback, set is_feedback false and omit title/body/theme.
No prose outside the JSON array.`;

function parseEnv(path) {
  const out = {};
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function extractFirstJsonArray(raw) {
  const text = raw.replace(/```(?:json)?/gi, '');
  const start = text.indexOf('[');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

async function resolveUserId(supabase) {
  let userId = null;
  try {
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const found = (data?.users ?? []).find(
        (u) => (u.email ?? '').toLowerCase() === TARGET_EMAIL.toLowerCase(),
      );
      if (found) return found.id;
      if (!data || data.users.length < 1000) break;
      page += 1;
    }
  } catch (e) {
    console.error('admin.listUsers failed, trying entries fallback:', e.message);
  }

  const { data, error } = await supabase.from('entries').select('user_id');
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  if (ids.length === 1) return ids[0];
  throw new Error(`Cannot resolve user. Distinct user_ids: ${ids.length}`);
}

async function analyzeEntries(apiKey, entries) {
  const payload = entries.map((e) => ({
    entry_id: e.id,
    domain: e.domain,
    title: e.title,
    raw_input: e.raw_input,
    description: e.description,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 4096,
      system: ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';
  const jsonText = extractFirstJsonArray(text);
  if (!jsonText) {
    throw new Error('Invalid analysis response — no JSON array found');
  }

  return JSON.parse(jsonText);
}

async function main() {
  const env = parseEnv(resolve(ROOT, '.env'));
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = env.ANTHROPIC_API_KEY;

  if (!url || !serviceKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  if (!anthropicKey) {
    console.error('Missing ANTHROPIC_API_KEY in .env (needed for Haiku analysis)');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const userId = await resolveUserId(supabase);
  console.log('USER_ID:', userId);

  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, domain, title, description, raw_input, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch entries:', error.message);
    process.exit(1);
  }

  const rows = entries ?? [];
  console.log('ENTRIES_TO_SCAN:', rows.length);
  if (rows.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const analysis = await analyzeEntries(anthropicKey, rows);
  const feedbackItems = analysis.filter((item) => item.is_feedback === true);

  console.log('FEEDBACK_FOUND:', feedbackItems.length);

  let inserted = 0;
  let skipped = 0;

  for (const item of feedbackItems) {
    const sourceEntry = rows.find((e) => e.id === item.entry_id);
    if (!sourceEntry) {
      console.warn('Skipping unknown entry_id:', item.entry_id);
      skipped += 1;
      continue;
    }

    const { error: insertError } = await supabase.from('app_feedback').insert({
      user_id: userId,
      title: item.title ?? sourceEntry.title,
      body: item.body ?? sourceEntry.raw_input ?? sourceEntry.description ?? sourceEntry.title,
      theme: item.theme ?? 'other',
      source: 'backfill',
      source_entry_id: sourceEntry.id,
      status: 'new',
    });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('Already backfilled:', sourceEntry.id);
        skipped += 1;
      } else {
        console.error('Insert failed for', sourceEntry.id, insertError.message);
        skipped += 1;
      }
      continue;
    }

    inserted += 1;
    console.log('Inserted:', item.title ?? sourceEntry.title);
  }

  console.log('DONE. Inserted:', inserted, 'Skipped:', skipped);
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
