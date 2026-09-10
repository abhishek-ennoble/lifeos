import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const MEMORY_LIMIT = 10;

export async function fetchMemorySummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('user_memory')
    .select('category, content, confidence')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(MEMORY_LIMIT);

  if (error || !data?.length) {
    return '';
  }

  const lines = data.map(
    (row) => `- [${row.category}] ${row.content}`,
  );
  return `\n\nUser context (learned patterns — use lightly):\n${lines.join('\n')}`;
}

export function appendMemoryToSystem(system: string, memorySummary: string): string {
  if (!memorySummary.trim()) {
    return system;
  }
  return `${system}${memorySummary}`;
}

/**
 * Compact user identity line from user_preferences (display_name).
 * Empty string when unset — prompts must never invent a name.
 */
export async function fetchProfileContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return '';
  }

  const prefs = data.preferences as { display_name?: unknown } | null;
  const name = typeof prefs?.display_name === 'string' ? prefs.display_name.trim() : '';
  if (!name) {
    return '';
  }
  return `\n\nThe user's name is ${name}. Address them naturally by first name when it fits.`;
}
