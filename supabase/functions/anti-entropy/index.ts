import { createUserScopedClient } from '../_shared/service-client.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  try {
    let supabase: Awaited<ReturnType<typeof createUserScopedClient>>['supabase'];
    let userId: string;
    try {
      const scoped = await createUserScopedClient(req);
      supabase = scoped.supabase;
      userId = scoped.userId;
    } catch (response) {
      return response as Response;
    }

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
