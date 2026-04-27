import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: 'Authentication required.' };
  }
  return { ok: true as const, user };
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function getUserProfile(userId?: string) {
  const id = userId ?? (await getCurrentUserId());
  if (!id) return null;
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin.from('profiles').select('*').eq('id', id).maybeSingle();
  return data ?? null;
}

export async function createUserProfileIfMissing(params: { userId: string; email?: string | null; fullName?: string | null }) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false as const, error: 'Supabase admin unavailable.' };
  const existing = await admin.from('profiles').select('id').eq('id', params.userId).maybeSingle();
  if (existing.data?.id) return { ok: true as const, created: false };
  const { error } = await admin.from('profiles').insert({
    id: params.userId,
    email: params.email ?? null,
    full_name: params.fullName ?? null,
    plan: 'free',
    subscription_status: 'free',
    onboarding_complete: false
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, created: true };
}

export async function getBrowserUser() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
