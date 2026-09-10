/**
 * One-shot feedback triage per docs/FEEDBACK_ANALYSIS.md §1b (2026-07-27).
 * - Fully shipped / consciously declined items → 'done'
 * - Everything else analyzed and mapped → 'triaged'
 * Idempotent: only touches rows still at status 'new'.
 *
 * Usage: node scripts/triage-feedback.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/** Items closed as shipped or declined (see FEEDBACK_ANALYSIS §1b). */
const DONE_MATCHERS = [
  // F4 — archive shipped
  (row) => row.title === 'App feature: save/archive tasks',
  // F8 — cheaper chat model declined at current spend
  (row) => row.body?.startsWith('we are using sonnet'),
];

async function main() {
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Need EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: rows, error } = await admin
    .from('app_feedback')
    .select('id, user_id, title, body, status, created_at')
    .eq('status', 'new')
    .order('created_at');
  if (error) throw error;

  if (!rows?.length) {
    console.log('No feedback rows at status=new — nothing to triage.');
    return;
  }

  let doneCount = 0;
  let triagedCount = 0;

  for (const row of rows) {
    const isDone = DONE_MATCHERS.some((match) => match(row));
    const status = isDone ? 'done' : 'triaged';
    const { error: updateError } = await admin
      .from('app_feedback')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'new');
    if (updateError) {
      console.log(`  FAIL ${row.id.slice(0, 8)} — ${updateError.message}`);
      continue;
    }
    if (isDone) doneCount += 1;
    else triagedCount += 1;
    console.log(`  ${status.padEnd(7)} [${row.created_at.slice(0, 10)}] ${(row.title ?? '').slice(0, 60)}`);
  }

  console.log(`\nTriage complete: ${triagedCount} triaged, ${doneCount} done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
