import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true, anonymous: true });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase admin unavailable.' }, { status: 500 });
  const now = new Date().toISOString();
  const { error } = await admin
    .from('profiles')
    .update({ last_active_at: now, updated_at: now })
    .eq('id', user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated_at: now });
}
