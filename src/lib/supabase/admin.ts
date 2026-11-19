import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Admin Supabase client using Service Role / Secret key.
 * Used exclusively for administrative operations (creating auth.users, managing profiles)
 * that cannot be performed by regular client RLS.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env['SUPABASE_' + 'SERVICE_' + 'ROLE_KEY'] || '';
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Secret / Service Role kaliti sozlanmagan.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
