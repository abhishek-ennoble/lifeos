/**
 * Pure helpers for reminder telemetry reconciliation (no RN / Supabase
 * imports so they are unit-testable). See `reminder-sync.ts` for the I/O.
 */

/** Small clock-skew allowance when matching a fired notification to its row. */
export const FIRE_MATCH_SKEW_MS = 5 * 60 * 1000;

export interface ReminderRowLite {
  id: string;
  fire_at: string;
}

/**
 * Which unsent rows count as "fired" at `now`. Local notifications fire at
 * `fire_at` by contract, so a past-due unsent row is one the app simply did
 * not observe (backgrounded). Mirrors the DB predicate in `reconcileFiredReminders`.
 */
export function selectFiredUnsent(
  rows: ReminderRowLite[],
  now: Date,
  skewMs: number = FIRE_MATCH_SKEW_MS,
): ReminderRowLite[] {
  const cutoff = now.getTime() + skewMs;
  return rows.filter((row) => new Date(row.fire_at).getTime() <= cutoff);
}
