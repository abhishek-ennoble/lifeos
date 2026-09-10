#!/usr/bin/env node
/**
 * Static audit: every service-role Supabase query in edge functions must filter by user_id.
 * Run: node scripts/audit-service-role-queries.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(root, 'supabase', 'functions');

const SERVICE_ROLE_MARKERS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'createServiceClient',
  'createUserScopedClient',
];

function walkTsFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory() && name !== '_shared') {
      walkTsFiles(path, acc);
    } else if (name.endsWith('.ts')) {
      acc.push(path);
    }
  }
  return acc;
}

const files = walkTsFiles(functionsDir);
const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const usesServiceRole = SERVICE_ROLE_MARKERS.some((m) => content.includes(m));
  if (!usesServiceRole) {
    continue;
  }

  const hasUserScope =
    content.includes(".eq('user_id'") ||
    content.includes('.eq("user_id"') ||
    content.includes('user_id: userId') ||
    content.includes('user_id: effectiveUserId') ||
    content.includes('createUserScopedClient') ||
    (content.includes('logAiUsage') && content.includes('userId'));

  if (!hasUserScope) {
    failures.push({
      file: file.replace(root + '\\', '').replace(root + '/', ''),
      reason: 'no user_id filter',
    });
  }
}

if (failures.length > 0) {
  console.error('Service-role audit FAILED:');
  for (const f of failures) {
    console.error(`  - ${f.file}: ${f.reason}`);
  }
  process.exit(1);
}

console.log(`Service-role audit PASSED (${files.length} function files scanned).`);
