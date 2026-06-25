// Read-only discovery: pull this user's entries from Supabase using the
// service-role key and dump them locally so we can recover app-improvement
// feedback that was captured via brain dump / notes but never labelled as
// feedback (the classifier has no `feedback` domain yet).
//
// Usage: node scripts/discover-feedback.mjs
// Requires in .env (gitignored): EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// NOTE: service-role bypasses RLS. This script is local-only, never bundled.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const TARGET_EMAIL = 'abhshk.0308@gmail.com';
const ROOT = process.cwd();

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

async function main() {
  const env = parseEnv(resolve(ROOT, '.env'));
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Resolve user_id from email via the admin API.
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
      if (found) {
        userId = found.id;
        break;
      }
      if (!data || data.users.length < 1000) break;
      page += 1;
    }
  } catch (e) {
    console.error('admin.listUsers failed, will try entries fallback:', e.message);
  }

  // Fallback: if only one user has entries, use that id.
  if (!userId) {
    const { data, error } = await supabase.from('entries').select('user_id');
    if (error) {
      console.error('entries fallback failed:', error.message);
      process.exit(1);
    }
    const ids = [...new Set((data ?? []).map((r) => r.user_id))];
    if (ids.length === 1) {
      userId = ids[0];
      console.error('Resolved user_id via single-user fallback.');
    } else {
      console.error(`Cannot resolve user. Distinct user_ids in entries: ${ids.length}`);
      process.exit(1);
    }
  }

  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, domain, title, description, raw_input, metadata, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch entries:', error.message);
    process.exit(1);
  }

  const rows = entries ?? [];
  const byDomain = {};
  for (const e of rows) {
    byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
  }

  mkdirSync(resolve(ROOT, '.discovery'), { recursive: true });
  writeFileSync(
    resolve(ROOT, '.discovery', 'entries.json'),
    JSON.stringify({ user_id: userId, count: rows.length, by_domain: byDomain, entries: rows }, null, 2),
  );

  console.log('USER_ID:', userId);
  console.log('TOTAL_ENTRIES:', rows.length);
  console.log('BY_DOMAIN:', JSON.stringify(byDomain));
  console.log('WROTE: .discovery/entries.json');
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
