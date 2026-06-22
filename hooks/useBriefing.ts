import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Briefing } from '@/types/entry';

interface UseBriefingResult {
  briefing: Briefing | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  generateBriefing: () => Promise<void>;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useBriefing(): UseBriefingResult {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
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

      const { data, error: fetchError } = await supabase
        .from('briefings')
        .select('*')
        .eq('date', todayDateString())
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setBriefing({
          id: data.id,
          user_id: data.user_id,
          content: data.content,
          date: data.date,
          generated_at: data.generated_at,
        });
      } else {
        setBriefing(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load briefing';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generateBriefing = useCallback(async () => {
    try {
      const { invokeFunction } = await import('@/lib/supabase');
      await invokeFunction<{ content: string }>('morning-briefing', {});
      await refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate briefing';
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

  return { briefing, loading, error, refresh, generateBriefing };
}
