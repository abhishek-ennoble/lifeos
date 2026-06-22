import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Reminder } from '@/types/entry';

interface UseRemindersResult {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  acknowledgeReminder: (id: string) => Promise<void>;
}

export function useReminders(): UseRemindersResult {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error: fetchError } = await supabase
        .from('reminders')
        .select('*')
        .gte('fire_at', startOfDay.toISOString())
        .lte('fire_at', endOfDay.toISOString())
        .order('fire_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setReminders(
        (data ?? []).map((row) => ({
          id: row.id,
          user_id: row.user_id,
          entry_id: row.entry_id,
          fire_at: row.fire_at,
          sent_at: row.sent_at,
          acknowledged_at: row.acknowledged_at,
        })),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reminders';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const acknowledgeReminder = useCallback(
    async (id: string) => {
      try {
        const { error: updateError } = await supabase
          .from('reminders')
          .update({ acknowledged_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to acknowledge reminder';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
  );

  return { reminders, loading, error, refresh, acknowledgeReminder };
}
