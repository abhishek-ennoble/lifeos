import { useCallback, useEffect, useState } from 'react';

import { invokeFunction, isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Entry } from '@/types/entry';

interface AntiEntropyResult {
  staleCount: number;
  staleEntries: Entry[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAntiEntropy(): AntiEntropyResult {
  const [staleCount, setStaleCount] = useState(0);
  const [staleEntries, setStaleEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('status', 'pending')
        .in('domain', ['task', 'learning', 'idea'])
        .lt('updated_at', thirtyDaysAgo.toISOString());

      if (error) {
        throw error;
      }

      const mapped = (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        raw_input: row.raw_input,
        domain: row.domain as Entry['domain'],
        title: row.title,
        description: row.description,
        metadata: row.metadata as Entry['metadata'],
        priority: row.priority as Entry['priority'],
        status: row.status as Entry['status'],
        is_recurring: row.is_recurring,
        recurrence_rule: row.recurrence_rule,
        due_at: row.due_at,
        expires_at: row.expires_at,
        last_reviewed_at: row.last_reviewed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      setStaleEntries(mapped);
      setStaleCount(mapped.length);
    } catch {
      setStaleCount(0);
      setStaleEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { staleCount, staleEntries, loading, refresh };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content }]);

    try {
      const response = await invokeFunction<{ reply: string }>('ai-chat', {
        message: content,
        history: messages.slice(-6),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return { messages, loading, error, sendMessage };
}
