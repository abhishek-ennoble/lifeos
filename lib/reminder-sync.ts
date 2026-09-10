/**
 * Cloud write-back for reminder telemetry. Local notifications are the
 * delivery mechanism; the `reminders` table is the record of truth for
 * "did it fire, did the user act". Without this, the backend is blind
 * to whether reminders help (introspection finding D2).
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Small clock-skew allowance when matching a fired notification to its row. */
const FIRE_MATCH_SKEW_MS = 5 * 60 * 1000;

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

/** Mark the most recent sent-but-unacknowledged reminder row as acknowledged. */
export async function markReminderAcknowledged(entryId: string): Promise<void> {
  try {
    if (!isSupabaseConfigured) {
      return;
    }

    const { data: row } = await supabase
      .from('reminders')
      .select('id')
      .eq('entry_id', entryId)
      .not('sent_at', 'is', null)
      .is('acknowledged_at', null)
      .order('fire_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return;
    }

    await supabase
      .from('reminders')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', row.id);
  } catch {
    // Telemetry is best-effort.
  }
}
