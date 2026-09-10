/**
 * Cloud write-back for reminder telemetry. Local notifications are the
 * delivery mechanism; the `reminders` table is the record of truth for
 * "did it fire, did the user act". Without this, the backend is blind
 * to whether reminders help (introspection finding D2).
 *
 * D2 root cause (2026-09-10): `addNotificationReceivedListener` only fires
 * while the app is foregrounded, so background deliveries never wrote
 * `sent_at`, and acknowledgements then no-op'd because they required it.
 * Fix: (1) `reconcileFiredReminders` on launch/foreground marks past-due
 * unsent rows as sent — local notifications fire at `fire_at` by contract;
 * (2) acknowledging falls back to a past-due unsent row.
 */

import { FIRE_MATCH_SKEW_MS, selectFiredUnsent } from '@/lib/reminder-sync-core';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Mark every past-due, unsent reminder row for the signed-in user as sent.
 * Called on app launch and on every foreground; idempotent and best-effort.
 * `sent_at` is set to the scheduled `fire_at` (the honest delivery time),
 * not to "now".
 */
export async function reconcileFiredReminders(): Promise<number> {
  try {
    if (!isSupabaseConfigured) {
      return 0;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() + FIRE_MATCH_SKEW_MS).toISOString();
    const { data: rows } = await supabase
      .from('reminders')
      .select('id, fire_at')
      .eq('user_id', user.id)
      .is('sent_at', null)
      .lte('fire_at', cutoff)
      .limit(200);

    const fired = selectFiredUnsent(rows ?? [], now);
    if (fired.length === 0) {
      return 0;
    }

    await Promise.all(
      fired.map((row) =>
        supabase.from('reminders').update({ sent_at: row.fire_at }).eq('id', row.id),
      ),
    );
    return fired.length;
  } catch {
    // Telemetry is best-effort; never surface to the user.
    return 0;
  }
}

/**
 * Mark the entry's due reminder row as sent. For recurring reminders past
 * their first fire (no unsent row left), insert a fired row so telemetry
 * still records the event.
 */
export async function markReminderSent(entryId: string): Promise<void> {
  try {
    if (!isSupabaseConfigured) {
      return;
    }

    const nowIso = new Date().toISOString();
    const matchBefore = new Date(Date.now() + FIRE_MATCH_SKEW_MS).toISOString();

    const { data: row } = await supabase
      .from('reminders')
      .select('id')
      .eq('entry_id', entryId)
      .is('sent_at', null)
      .lte('fire_at', matchBefore)
      .order('fire_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (row) {
      await supabase.from('reminders').update({ sent_at: nowIso }).eq('id', row.id);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    await supabase.from('reminders').insert({
      user_id: user.id,
      entry_id: entryId,
      fire_at: nowIso,
      sent_at: nowIso,
    });
  } catch {
    // Telemetry is best-effort; never block the notification flow.
  }
}

/**
 * Mark the most recent sent-but-unacknowledged reminder row as acknowledged.
 * If no row was ever marked sent (background delivery), fall back to the most
 * recent past-due unsent row and stamp both — the user acting on it is proof
 * it fired.
 */
export async function markReminderAcknowledged(entryId: string): Promise<void> {
  try {
    if (!isSupabaseConfigured) {
      return;
    }

    const nowIso = new Date().toISOString();

    const { data: sentRow } = await supabase
      .from('reminders')
      .select('id')
      .eq('entry_id', entryId)
      .not('sent_at', 'is', null)
      .is('acknowledged_at', null)
      .order('fire_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sentRow) {
      await supabase.from('reminders').update({ acknowledged_at: nowIso }).eq('id', sentRow.id);
      return;
    }

    const matchBefore = new Date(Date.now() + FIRE_MATCH_SKEW_MS).toISOString();
    const { data: unsentRow } = await supabase
      .from('reminders')
      .select('id, fire_at')
      .eq('entry_id', entryId)
      .is('sent_at', null)
      .lte('fire_at', matchBefore)
      .order('fire_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!unsentRow) {
      return;
    }

    await supabase
      .from('reminders')
      .update({ sent_at: unsentRow.fire_at, acknowledged_at: nowIso })
      .eq('id', unsentRow.id);
  } catch {
    // Telemetry is best-effort.
  }
}
