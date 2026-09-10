#!/usr/bin/env node
/**
 * Pre-handoff smoke tests (dev machine). Complements device checklist — not a substitute.
 * Requires .env with EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY.
 * Optional: SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD for live edge-function latency.
 *
 * Run: node scripts/smoke-release.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const path = join(root, '.env');
  if (!existsSync(path)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = env.SMOKE_TEST_EMAIL;
const testPassword = env.SMOKE_TEST_PASSWORD;

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function skip(name, detail = '') {
  results.push({ name, ok: null, detail });
  console.log(`  SKIP  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Mirror lib/inbox-query.ts pendingOnly + journal exception. */
function entryMatchesInboxFilters(entry, filters) {
  if (filters.pendingOnly && entry.status !== 'pending') {
    if (entry.domain !== 'journal') {
      return false;
    }
  }
  return true;
}

console.log('\nLifeOS release smoke tests\n');

// --- Static inbox filter logic ---
{
  const note = { domain: 'note', status: 'pending' };
  const journal = { domain: 'journal', status: 'done' };
  const doneTask = { domain: 'task', status: 'done' };
  const filters = { pendingOnly: true };

  if (entryMatchesInboxFilters(note, filters)) {
    pass('Inbox filter: pending notes visible');
  } else {
    fail('Inbox filter: pending notes visible');
  }

  if (entryMatchesInboxFilters(journal, filters)) {
    pass('Inbox filter: journals visible (done status)');
  } else {
    fail('Inbox filter: journals visible (done status)');
  }

  if (!entryMatchesInboxFilters(doneTask, filters)) {
    pass('Inbox filter: done tasks hidden when pendingOnly');
  } else {
    fail('Inbox filter: done tasks hidden when pendingOnly');
  }
}

if (!url || !anonKey) {
  skip('Supabase configured', 'Missing EXPO_PUBLIC_* in .env');
} else {
  pass('Supabase configured', url.replace(/https:\/\/([^.]+).*/, '$1…'));

  const supabase = createClient(url, anonKey);

  if (!testEmail || !testPassword) {
    skip('Auth + edge functions', 'Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env');
  } else {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      fail('Auth sign-in', authError.message);
    } else {
      pass('Auth sign-in', authData.user?.email ?? 'ok');

      const samples = [
        { label: 'task', raw: 'Smoke test: buy groceries tomorrow' },
        { label: 'note', raw: 'Smoke test note: keys on kitchen counter' },
        { label: 'idea', raw: 'idea: Smoke test side project' },
      ];

      const latencies = [];

      for (const sample of samples) {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('classify-entry', {
          body: { raw_input: sample.raw },
        });
        const ms = Date.now() - start;
        latencies.push(ms);

        if (error) {
          fail(`classify-entry (${sample.label})`, error.message);
          continue;
        }

        const items = data?.items ?? [];
        if (items.length === 0) {
          fail(`classify-entry (${sample.label})`, 'empty items');
          continue;
        }

        pass(`classify-entry (${sample.label})`, `${ms}ms → ${items[0].domain}`);

        // Insert + verify inbox-visible (then archive to avoid clutter)
        const classified = items[0];
        const { data: inserted, error: insertError } = await supabase
          .from('entries')
          .insert({
            user_id: authData.user.id,
            raw_input: sample.raw,
            domain: classified.domain,
            title: classified.title,
            description: classified.description,
            metadata: classified.metadata,
            priority: classified.priority ?? 'medium',
            status: 'pending',
            is_recurring: classified.is_recurring ?? false,
            recurrence_rule: classified.recurrence_rule,
            due_at: classified.due_at,
            expires_at: classified.expires_at,
          })
          .select('id, domain, status')
          .single();

        if (insertError) {
          fail(`entries insert (${sample.label})`, insertError.message);
        } else if (entryMatchesInboxFilters(inserted, { pendingOnly: true })) {
          pass(`Inbox visibility (${sample.label})`, inserted.domain);
          await supabase.from('entries').update({ status: 'archived' }).eq('id', inserted.id);
        } else {
          fail(`Inbox visibility (${sample.label})`, 'filtered out by pendingOnly');
        }
      }

      if (latencies.length > 0) {
        const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        const max = Math.max(...latencies);
        if (max <= 15000) {
          pass('classify latency', `avg ${avg}ms, max ${max}ms`);
        } else {
          fail('classify latency', `max ${max}ms (>15s)`);
        }
      }

      // Journal path: direct insert (no classify)
      const journalStart = Date.now();
      const { data: journalRow, error: journalError } = await supabase
        .from('entries')
        .insert({
          user_id: authData.user.id,
          raw_input: 'Smoke test journal entry',
          domain: 'journal',
          title: 'Smoke test journal entry',
          description: 'Smoke test journal entry',
          metadata: {},
          priority: 'low',
          status: 'done',
          is_recurring: false,
        })
        .select('id, domain, status')
        .single();

      const journalMs = Date.now() - journalStart;

      if (journalError) {
        fail('journal insert', journalError.message);
      } else if (entryMatchesInboxFilters(journalRow, { pendingOnly: true })) {
        pass('journal inbox visibility', `${journalMs}ms`);
        await supabase.from('entries').update({ status: 'archived' }).eq('id', journalRow.id);
      } else {
        fail('journal inbox visibility', 'hidden by pendingOnly filter');
      }

      // ai-chat read-only smoke
      const chatStart = Date.now();
      const { data: chatData, error: chatError } = await supabase.functions.invoke('ai-chat', {
        body: { message: 'What should I focus on today?', history: [] },
      });
      const chatMs = Date.now() - chatStart;

      if (chatError) {
        fail('ai-chat', chatError.message);
      } else if (typeof chatData?.reply === 'string' && chatData.reply.length > 0) {
        pass('ai-chat', `${chatMs}ms, ${chatData.reply.length} chars`);
      } else {
        fail('ai-chat', 'empty reply');
      }
    }
  }
}

const failed = results.filter((r) => r.ok === false).length;
const passed = results.filter((r) => r.ok === true).length;
const skipped = results.filter((r) => r.ok === null).length;

console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
process.exit(failed > 0 ? 1 : 0);
