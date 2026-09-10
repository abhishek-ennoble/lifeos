import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { getUserId } from './cors.ts';

/**
 * Service-role Supabase client. Bypasses RLS — every query MUST filter by user_id.
 * Use {@link createUserScopedClient} in edge functions instead of calling this directly.
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(supabaseUrl, serviceKey);
}

/** Authenticated user id or null. Prefer {@link requireUserId} in edge handlers. */
export { getUserId };

/** Throws 401 Response if not authenticated. */
export async function requireUserId(req: Request): Promise<string> {
  const userId = await getUserId(req);
  if (!userId) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return userId;
}

/**
 * Service client + verified user id. All DB reads/writes must chain `.eq('user_id', userId)`.
 */
export async function createUserScopedClient(req: Request): Promise<{
  supabase: SupabaseClient;
  userId: string;
}> {
  const userId = await requireUserId(req);
  return { supabase: createServiceClient(), userId };
}
