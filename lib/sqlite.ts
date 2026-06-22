import * as SQLite from 'expo-sqlite';

import type { Entry } from '@/types/entry';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('lifeos.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        raw_input TEXT,
        domain TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurrence_rule TEXT,
        due_at TEXT,
        expires_at TEXT,
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT
      );
    `);
  }
  return db;
}

function rowToEntry(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    raw_input: (row.raw_input as string | null) ?? null,
    domain: row.domain as Entry['domain'],
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    priority: row.priority as Entry['priority'],
    status: row.status as Entry['status'],
    is_recurring: Boolean(row.is_recurring),
    recurrence_rule: (row.recurrence_rule as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    last_reviewed_at: (row.last_reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function cacheEntries(entries: Entry[]): Promise<void> {
  try {
    const database = await getDb();
    for (const entry of entries) {
      await database.runAsync(
        `INSERT OR REPLACE INTO entries (
          id, user_id, raw_input, domain, title, description, metadata,
          priority, status, is_recurring, recurrence_rule, due_at, expires_at,
          last_reviewed_at, created_at, updated_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.user_id,
          entry.raw_input,
          entry.domain,
          entry.title,
          entry.description,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.priority,
          entry.status,
          entry.is_recurring ? 1 : 0,
          entry.recurrence_rule,
          entry.due_at,
          entry.expires_at,
          entry.last_reviewed_at,
          entry.created_at,
          entry.updated_at,
          new Date().toISOString(),
        ],
      );
    }
  } catch {
    // Offline cache is best-effort
  }
}

export async function readCachedEntries(domain?: Entry['domain']): Promise<Entry[]> {
  try {
    const database = await getDb();
    const rows = domain
      ? await database.getAllAsync<Record<string, unknown>>(
          'SELECT * FROM entries WHERE domain = ? ORDER BY created_at DESC',
          [domain],
        )
      : await database.getAllAsync<Record<string, unknown>>(
          'SELECT * FROM entries ORDER BY created_at DESC',
        );

    return rows.map(rowToEntry);
  } catch {
    return [];
  }
}

export async function upsertCachedEntry(entry: Entry): Promise<void> {
  await cacheEntries([entry]);
}
