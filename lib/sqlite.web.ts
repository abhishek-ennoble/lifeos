import type { Entry } from '@/types/entry';

/**
 * Web stub: offline SQLite is mobile-only in LifeOS MVP.
 * Supabase is the source of truth on web preview; cache ops are no-ops.
 */
export async function cacheEntries(_entries: Entry[]): Promise<void> {
  // no-op
}

export async function readCachedEntries(_domain?: Entry['domain']): Promise<Entry[]> {
  return [];
}

export async function upsertCachedEntry(_entry: Entry): Promise<void> {
  // no-op
}
