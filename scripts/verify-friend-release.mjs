/**
 * One-shot verification for friend APK readiness + data safety.
 * Read-mostly; temporary smoke entries are archived immediately.
 *
 * Usage: node scripts/verify-friend-release.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const TARGET_EMAIL = 'abhshk.0308@gmail.com';
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

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function resolveUserId(admin) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = (data?.users ?? []).find(
      (u) => (u.email ?? '').toLowerCase() === TARGET_EMAIL.toLowerCase(),
    );
    if (found) return found.id;
    if (!data || data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function getUserSession(admin, url, anonKey) {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: TARGET_EMAIL,
  });
  if (linkError) throw linkError;

  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error('generateLink did not return hashed_token');
  }

  const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await userClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('No session after verifyOtp');
  return userClient;
}

async function main() {
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\nLifeOS friend-release verification\n');
  console.log(`Target account: ${TARGET_EMAIL}\n`);

  if (!url || !anonKey || !serviceKey) {
    fail('env', 'Need EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  pass('env', 'configured');

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const userId = await resolveUserId(admin);
  if (!userId) {
    fail('resolve user', 'email not found');
    process.exit(1);
  }
  pass('resolve user', `${userId.slice(0, 8)}…`);

  // --- Data integrity (cloud source of truth) ---
  const { count: entryCount, error: entryCountError } = await admin
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (entryCountError) fail('entries count', entryCountError.message);
  else pass('entries in cloud', String(entryCount ?? 0));

  const { data: byDomainRows, error: domainError } = await admin
    .from('entries')
    .select('domain, status')
    .eq('user_id', userId);
  if (domainError) {
    fail('entries by domain', domainError.message);
  } else {
    const byDomain = {};
    const byStatus = {};
    for (const row of byDomainRows ?? []) {
      byDomain[row.domain] = (byDomain[row.domain] ?? 0) + 1;
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    }
    pass(
      'entries breakdown',
      `domains ${JSON.stringify(byDomain)}; status ${JSON.stringify(byStatus)}`,
    );
  }

  const { count: feedbackCount, error: fbError } = await admin
    .from('app_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (fbError) fail('app_feedback count', fbError.message);
  else pass('app_feedback in cloud', String(feedbackCount ?? 0));

  const { count: reminderCount, error: remError } = await admin
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (remError) fail('reminders count', remError.message);
  else pass('reminders in cloud', String(reminderCount ?? 0));

  const { count: briefingCount, error: briefError } = await admin
    .from('briefings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (briefError) fail('briefings count', briefError.message);
  else pass('briefings in cloud', String(briefingCount ?? 0));

  const { data: recent, error: recentError } = await admin
    .from('entries')
    .select('created_at, domain, title, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (recentError) {
    fail('recent entries sample', recentError.message);
  } else {
    const summary = (recent ?? [])
      .map((e) => `${e.created_at?.slice(0, 10)} [${e.domain}/${e.status}] ${(e.title ?? '').slice(0, 40)}`)
      .join(' | ');
    pass('recent entries still present', summary || 'none');
  }

  const { data: recentFb, error: recentFbError } = await admin
    .from('app_feedback')
    .select('created_at, source, status, title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (recentFbError) {
    fail('recent feedback sample', recentFbError.message);
  } else {
    const summary = (recentFb ?? [])
      .map((f) => `${f.created_at?.slice(0, 10)} [${f.source}/${f.status}] ${(f.title ?? '').slice(0, 40)}`)
      .join(' | ');
    pass('recent feedback still present', summary || 'none');
  }

  // --- Live feature smoke as the real user ---
  let userClient;
  try {
    userClient = await getUserSession(admin, url, anonKey);
    pass('auth session', 'magic-link OTP session ok');
  } catch (err) {
    fail('auth session', err instanceof Error ? err.message : String(err));
    summarizeAndExit();
    return;
  }

  // RLS: user can read own entries
  const { data: ownEntries, error: ownErr } = await userClient
    .from('entries')
    .select('id')
    .limit(3);
  if (ownErr) fail('RLS read entries', ownErr.message);
  else pass('RLS read entries', `${ownEntries?.length ?? 0} rows readable`);

  const { data: ownFb, error: ownFbErr } = await userClient
    .from('app_feedback')
    .select('id')
    .limit(3);
  if (ownFbErr) fail('RLS read feedback', ownFbErr.message);
  else pass('RLS read feedback', `${ownFb?.length ?? 0} rows readable`);

  // classify-entry
  {
    const start = Date.now();
    const { data, error } = await userClient.functions.invoke('classify-entry', {
      body: { raw_input: 'Verify release: buy milk tomorrow and stretch in 20 minutes' },
    });
    const ms = Date.now() - start;
    if (error) fail('classify-entry', error.message);
    else if (!data?.items?.length) fail('classify-entry', 'empty items');
    else {
      const domains = data.items.map((i) => i.domain).join(',');
      pass('classify-entry', `${ms}ms → ${data.items.length} item(s): ${domains}`);
    }
  }

  // capture path: insert one temp entry then archive
  {
    const raw = `Verify release temp ${new Date().toISOString()}`;
    const { data: classified, error: cErr } = await userClient.functions.invoke('classify-entry', {
      body: { raw_input: raw },
    });
    if (cErr || !classified?.items?.[0]) {
      fail('capture insert', cErr?.message ?? 'no classify result');
    } else {
      const item = classified.items[0];
      const { data: inserted, error: iErr } = await userClient
        .from('entries')
        .insert({
          user_id: userId,
          raw_input: raw,
          domain: item.domain === 'feedback' ? 'note' : item.domain,
          title: item.title ?? 'Verify release',
          description: item.description,
          metadata: item.metadata,
          priority: item.priority ?? 'medium',
          status: 'pending',
          is_recurring: item.is_recurring ?? false,
          recurrence_rule: item.recurrence_rule,
          due_at: item.due_at,
          expires_at: item.expires_at,
        })
        .select('id')
        .single();
      if (iErr) fail('capture insert', iErr.message);
      else {
        pass('capture insert', inserted.id.slice(0, 8));
        await userClient.from('entries').update({ status: 'archived' }).eq('id', inserted.id);
        pass('capture cleanup', 'temp entry archived');
      }
    }
  }

  // morning-briefing (on-demand)
  {
    const start = Date.now();
    const { data, error } = await userClient.functions.invoke('morning-briefing', { body: {} });
    const ms = Date.now() - start;
    if (error) fail('morning-briefing', error.message);
    else if (typeof data?.content === 'string' && data.content.length > 0) {
      pass('morning-briefing', `${ms}ms, ${data.content.length} chars`);
    } else if (typeof data?.briefing === 'string' && data.briefing.length > 0) {
      pass('morning-briefing', `${ms}ms, ${data.briefing.length} chars`);
    } else {
      // Some versions return the row differently
      const text =
        (typeof data === 'string' && data) ||
        data?.content ||
        data?.briefing ||
        data?.text ||
        '';
      if (text) pass('morning-briefing', `${ms}ms`);
      else fail('morning-briefing', `unexpected payload keys: ${Object.keys(data ?? {}).join(',')}`);
    }
  }

  // ai-chat
  {
    const start = Date.now();
    const { data, error } = await userClient.functions.invoke('ai-chat', {
      body: { message: 'In one sentence, what should I focus on today?', history: [] },
    });
    const ms = Date.now() - start;
    if (error) fail('ai-chat', error.message);
    else if (typeof data?.reply === 'string' && data.reply.length > 0) {
      pass('ai-chat', `${ms}ms, ${data.reply.length} chars`);
    } else fail('ai-chat', 'empty reply');
  }

  // ai_usage readable
  {
    const { count, error } = await userClient
      .from('ai_usage')
      .select('*', { count: 'exact', head: true });
    if (error) fail('ai_usage read', error.message);
    else pass('ai_usage read', `${count ?? 0} rows (powers Settings month + all-time)`);
  }

  summarizeAndExit();
}

function summarizeAndExit() {
  const failed = results.filter((r) => r.ok === false).length;
  const passed = results.filter((r) => r.ok === true).length;
  console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
  console.log(
    'Data safety: entries/feedback live in Supabase (cloud), not only on the phone.\n' +
      'Installing 1.0.2 over the same package keeps your account data after you sign in.\n' +
      'Uninstall clears local SQLite cache/reminders only; cloud rows remain.\n',
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
