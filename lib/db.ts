import { getServerEnvStatus } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentUserId } from '@/lib/auth';

export function getDbGuard() {
  const env = getServerEnvStatus();
  if (!env.supabaseEnabled) {
    const configured = env.hasSupabaseUrl || env.hasSupabaseAnonKey || env.hasSupabaseServiceRole;
    return {
      ok: false as const,
      status: 200,
      body: {
        ok: false,
        db_enabled: false,
        reason: configured
          ? 'Supabase env is configured but DB route says disabled. Check SUPABASE_DB_ENABLED=true and restart dev server.'
          : 'Supabase disabled; using localStorage fallback.'
      }
    };
  }
  if (!env.hasSupabaseUrl || !env.hasSupabaseServiceRole) {
    return {
      ok: false as const,
      status: 500,
      body: { ok: false, db_enabled: true, reason: 'Supabase env vars missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }
    };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false as const, status: 500, body: { ok: false, db_enabled: true, reason: 'Supabase admin client unavailable.' } };
  }
  return { ok: true as const, supabase };
}

export async function getDbUserGuard() {
  const guard = getDbGuard();
  if (!guard.ok) return guard;
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      ok: false as const,
      status: 401,
      body: { ok: false, error: 'Authentication required.' }
    };
  }
  return { ok: true as const, supabase: guard.supabase, userId };
}
