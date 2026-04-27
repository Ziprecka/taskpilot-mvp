import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user ?? null, error };
}

export async function requireUser() {
  const { user, error } = await getCurrentUser();
  if (!user) {
    return { user: null, error };
  }
  return { user, error: null };
}

export async function getCurrentUserId() {
  const { user } = await getCurrentUser();
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

export async function ensureProfileForUser(user: User) {
  return createUserProfileIfMissing({
    userId: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null
  });
}
