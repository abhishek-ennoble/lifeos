import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppFeedback, FeedbackStatus } from '@/types/feedback';

interface UseFeedbackResult {
  feedback: AppFeedback[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (id: string, status: FeedbackStatus) => Promise<void>;
}

function mapRow(row: Record<string, unknown>): AppFeedback {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    body: row.body as string,
    theme: (row.theme as string | null) ?? null,
    source: row.source as AppFeedback['source'],
    source_entry_id: (row.source_entry_id as string | null) ?? null,
    status: row.status as FeedbackStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useFeedback(): UseFeedbackResult {
  const [feedback, setFeedback] = useState<AppFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        setFeedback([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('app_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setFeedback((data ?? []).map((row) => mapRow(row as Record<string, unknown>)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(message);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateStatus = useCallback(
    async (id: string, status: FeedbackStatus) => {
      try {
        const { error: updateError } = await supabase
          .from('app_feedback')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update feedback';
        setError(message);
        throw new Error(message);
      }
    },
    [refresh],
  );

  return { feedback, loading, error, refresh, updateStatus };
}
