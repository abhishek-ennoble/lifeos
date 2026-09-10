/**
 * Read-only usage introspection across accounts.
 * Pulls entries, reminders, feedback, AI usage, briefings, memory for each
 * target account and writes a full dump to .discovery/introspection.json
 * plus a console summary.
 *
 * Usage:
 *   node scripts/introspect-usage.mjs            # default target emails
 *   node scripts/introspect-usage.mjs --all      # every user in auth.users
 *   node scripts/introspect-usage.mjs a@b.com …  # explicit emails
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const TARGET_EMAILS = ['abhshk.0308@gmail.com', 'manish.kumar2107@gmail.com'];
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

async function resolveUsers(admin) {
  const args = process.argv.slice(2);
  const allUsers = args.includes('--all');
  const explicit = args.filter((a) => a.includes('@'));
  const targets = explicit.length > 0 ? explicit : TARGET_EMAILS;
  const wanted = new Map(allUsers ? [] : targets.map((e) => [e.toLowerCase(), null]));
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data?.users ?? []) {
      const email = (u.email ?? '').toLowerCase();
      if (allUsers || wanted.has(email)) {
        wanted.set(email, {
          id: u.id,
          email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        });
      }
    }
    if (!data || data.users.length < 200) break;
    page += 1;
  }
  return wanted;
}

function tally(rows, key) {
  const out = {};
  for (const row of rows ?? []) {
    const v = row[key] ?? 'null';
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

function byDay(rows, key = 'created_at') {
  const out = {};
  for (const row of rows ?? []) {
    const day = (row[key] ?? '').slice(0, 10);
    if (!day) continue;
    out[day] = (out[day] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort());
}

async function fetchAll(admin, table, userId, columns, order = 'created_at') {
  const { data, error } = await admin
    .from(table)
    .select(columns)
    .eq('user_id', userId)
    .order(order, { ascending: false })
    .limit(500);
  if (error) return { error: error.message };
  return { rows: data ?? [] };
}

async function introspectUser(admin, user) {
  const report = { user };

  // Entries — the core capture record
  const entries = await fetchAll(
    admin,
    'entries',
    user.id,
    'id, created_at, updated_at, domain, title, description, raw_input, priority, status, is_recurring, due_at, expires_at, metadata',
  );
  if (entries.error) {
    report.entries = { error: entries.error };
  } else {
    report.entries = {
      count: entries.rows.length,
      byDomain: tally(entries.rows, 'domain'),
      byStatus: tally(entries.rows, 'status'),
      byPriority: tally(entries.rows, 'priority'),
      perDay: byDay(entries.rows),
      rows: entries.rows,
    };
  }

  // Reminders — accountability loop signal
  const reminders = await fetchAll(
    admin,
    'reminders',
    user.id,
    '*',
    'fire_at',
  );
  if (reminders.error) {
    report.reminders = { error: reminders.error };
  } else {
    report.reminders = {
      count: reminders.rows.length,
      sent: reminders.rows.filter((r) => r.sent_at).length,
      acknowledged: reminders.rows.filter((r) => r.acknowledged_at).length,
      rows: reminders.rows,
    };
  }

  // App feedback — the friend reported the bug here
  const feedback = await fetchAll(admin, 'app_feedback', user.id, '*');
  report.app_feedback = feedback.error
    ? { error: feedback.error }
    : { count: feedback.rows.length, rows: feedback.rows };

  // AI usage — cost visibility
  const usage = await fetchAll(admin, 'ai_usage', user.id, '*');
  if (usage.error) {
    report.ai_usage = { error: usage.error };
  } else {
    const byTask = {};
    for (const row of usage.rows) {
      const k = row.task ?? row.function_name ?? row.kind ?? 'unknown';
      byTask[k] = byTask[k] ?? { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 };
      byTask[k].calls += 1;
      byTask[k].input_tokens += row.input_tokens ?? 0;
      byTask[k].output_tokens += row.output_tokens ?? 0;
      byTask[k].cost_usd += Number(row.est_cost_usd ?? 0);
    }
    report.ai_usage = {
      count: usage.rows.length,
      byTask,
      perDay: byDay(usage.rows),
      sample: usage.rows.slice(0, 3),
    };
  }

  // Briefings
  const briefings = await fetchAll(admin, 'briefings', user.id, 'id, date, generated_at, content', 'generated_at');
  report.briefings = briefings.error
    ? { error: briefings.error }
    : {
        count: briefings.rows.length,
        latest: briefings.rows[0]?.date ?? null,
        perDay: byDay(briefings.rows, 'generated_at'),
        latestContent: briefings.rows[0]?.content ?? null,
      };

  // Memory + preferences (foundation 1.3)
  const memory = await fetchAll(admin, 'user_memory', user.id, '*');
  report.user_memory = memory.error
    ? { error: memory.error }
    : { count: memory.rows.length, rows: memory.rows };

  const prefs = await fetchAll(admin, 'user_preferences', user.id, '*', 'updated_at');
  report.user_preferences = prefs.error
    ? { error: prefs.error }
    : { count: prefs.rows.length, rows: prefs.rows };

  const digests = await fetchAll(admin, 'feedback_digests', user.id, '*', 'generated_at');
  report.feedback_digests = digests.error
    ? { error: digests.error }
    : { count: digests.rows.length, rows: digests.rows };

  return report;
}

function printSummary(report) {
  const u = report.user;
  console.log(`\n=== ${u.email} ===`);
  console.log(`  user_id: ${u.id}`);
  console.log(`  account created: ${u.created_at?.slice(0, 10)}, last sign-in: ${u.last_sign_in_at?.slice(0, 10) ?? 'never'}`);
  const e = report.entries;
  if (e.error) console.log(`  entries: ERROR ${e.error}`);
  else {
    console.log(`  entries: ${e.count}`);
    console.log(`    by domain: ${JSON.stringify(e.byDomain)}`);
    console.log(`    by status: ${JSON.stringify(e.byStatus)}`);
    console.log(`    active days: ${Object.keys(e.perDay).length} (${Object.keys(e.perDay)[0] ?? '-'} → ${Object.keys(e.perDay).at(-1) ?? '-'})`);
  }
  const r = report.reminders;
  if (r.error) console.log(`  reminders: ERROR ${r.error}`);
  else console.log(`  reminders: ${r.count} (sent ${r.sent}, acknowledged ${r.acknowledged})`);
  const f = report.app_feedback;
  if (f.error) console.log(`  app_feedback: ERROR ${f.error}`);
  else {
    console.log(`  app_feedback: ${f.count}`);
    for (const row of f.rows) {
      console.log(`    - [${(row.created_at ?? '').slice(0, 10)}] (${row.source ?? '?'}/${row.status ?? '?'}) ${row.title ?? row.body ?? ''}`);
    }
  }
  const a = report.ai_usage;
  if (a.error) console.log(`  ai_usage: ERROR ${a.error}`);
  else {
    console.log(`  ai_usage: ${a.count} calls`);
    for (const [task, s] of Object.entries(a.byTask)) {
      console.log(`    ${task}: ${s.calls} calls, ${s.input_tokens} in / ${s.output_tokens} out tokens, $${s.cost_usd.toFixed(4)}`);
    }
  }
  const b = report.briefings;
  if (b.error) console.log(`  briefings: ERROR ${b.error}`);
  else console.log(`  briefings: ${b.count}, latest ${b.latest ?? '-'}`);
  console.log(`  user_memory: ${report.user_memory.count ?? `ERROR ${report.user_memory.error}`}`);
  console.log(`  user_preferences: ${report.user_preferences.count ?? `ERROR ${report.user_preferences.error}`}`);
  console.log(`  feedback_digests: ${report.feedback_digests.count ?? `ERROR ${report.feedback_digests.error}`}`);
}

async function main() {
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Need EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const users = await resolveUsers(admin);

  const reports = [];
  for (const [email, user] of users) {
    if (!user) {
      console.log(`\n=== ${email} ===\n  NOT FOUND in auth.users`);
      continue;
    }
    const report = await introspectUser(admin, user);
    printSummary(report);
    reports.push(report);
  }

  const outDir = join(root, '.discovery');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'introspection.json');
  writeFileSync(outPath, JSON.stringify(reports, null, 2));
  console.log(`\nFull dump written to .discovery/introspection.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
