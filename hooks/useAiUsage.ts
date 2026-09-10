import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AiUsageRow {
  function_name: string;
  input_tokens: number;
  output_tokens: number;
  est_cost_usd: number;
  created_at: string;
}

export interface AiUsageSummary {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
  byFunction: Record<string, { cost: number; calls: number }>;
}

interface UseAiUsageResult {
  /** Usage since local midnight today. */
  today: AiUsageSummary | null;
  /** Usage since the 1st of the current calendar month (UTC). */
  month: AiUsageSummary | null;
  /** Cumulative usage across all recorded calls. */
  allTime: AiUsageSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function emptySummary(): AiUsageSummary {
  return {
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    callCount: 0,
    byFunction: {},
  };
}

function summarize(rows: AiUsageRow[]): AiUsageSummary {
  const byFunction: Record<string, { cost: number; calls: number }> = {};
  let totalCostUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const row of rows) {
    const cost = Number(row.est_cost_usd) || 0;
    totalCostUsd += cost;
    totalInputTokens += row.input_tokens ?? 0;
    totalOutputTokens += row.output_tokens ?? 0;

    const fn = row.function_name ?? 'unknown';
    if (!byFunction[fn]) {
      byFunction[fn] = { cost: 0, calls: 0 };
    }
    byFunction[fn].cost += cost;
    byFunction[fn].calls += 1;
  }

  return {
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    callCount: rows.length,
    byFunction,
  };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function dayStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function useAiUsage(): UseAiUsageResult {
  const [today, setToday] = useState<AiUsageSummary | null>(null);
  const [month, setMonth] = useState<AiUsageSummary | null>(null);
  const [allTime, setAllTime] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        setToday(null);
        setMonth(null);
        setAllTime(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('ai_usage')
        .select('function_name, input_tokens, output_tokens, est_cost_usd, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const rows = (data ?? []) as AiUsageRow[];
      const monthStart = monthStartIso();
      const dayStart = dayStartIso();
      const monthRows = rows.filter((row) => row.created_at >= monthStart);
      const todayRows = rows.filter((row) => row.created_at >= dayStart);

      setAllTime(rows.length > 0 ? summarize(rows) : emptySummary());
      setMonth(monthRows.length > 0 ? summarize(monthRows) : emptySummary());
      setToday(todayRows.length > 0 ? summarize(todayRows) : emptySummary());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load AI usage';
      setError(message);
      setToday(null);
      setMonth(null);
      setAllTime(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { today, month, allTime, loading, error, refresh };
}

export function formatUsd(amount: number): string {
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(2)}`;
}
