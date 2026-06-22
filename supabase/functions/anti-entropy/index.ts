import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleCors, jsonResponse, getUserId } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleEntries, error } = await supabase
      .from('entries')
      .select('id, title, domain, updated_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .in('domain', ['task', 'learning', 'idea'])
      .lt('updated_at', thirtyDaysAgo.toISOString());

    if (error) {
      throw error;
    }

    const count = staleEntries?.length ?? 0;
    const message =
      count > 0
        ? `You have ${count} things that haven't moved in 30+ days. Want to review them?`
        : 'All clear — nothing stale this week.';

    return jsonResponse({
      stale_count: count,
      message,
      entries: staleEntries ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Anti-entropy check failed';
    return jsonResponse({ error: message }, 500);
  }
});
