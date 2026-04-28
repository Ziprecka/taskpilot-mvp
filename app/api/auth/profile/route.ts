import { NextRequest, NextResponse } from 'next/server';
import { createUserProfileIfMissing, getCurrentUser, getUserProfile } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  const profile = await getUserProfile(user.id);
  return NextResponse.json({ ok: true, profile });
}

export async function POST(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  const body = await req.json();
  const result = await createUserProfileIfMissing({
    userId: user.id,
    email: body.email ?? user.email ?? null,
    fullName: body.full_name ?? user.user_metadata?.full_name ?? null,
    source: body.source ?? body.utm_source ?? null,
    ref: body.ref ?? null,
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
    utm_content: body.utm_content ?? null,
    x_handle: body.x_handle ?? null
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  const profile = await getUserProfile(user.id);
  return NextResponse.json({ ok: true, profile, created: result.created });
}

export async function PATCH(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  const body = await req.json();
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase admin unavailable.' }, { status: 500 });
  const { data, error } = await admin
    .from('profiles')
    .update({
      full_name: body.full_name ?? null,
      avatar_url: body.avatar_url ?? null,
      onboarding_complete: typeof body.onboarding_complete === 'boolean' ? body.onboarding_complete : undefined,
      source: body.source ?? undefined,
      ref: body.ref ?? undefined,
      utm_source: body.utm_source ?? undefined,
      utm_medium: body.utm_medium ?? undefined,
      utm_campaign: body.utm_campaign ?? undefined,
      utm_content: body.utm_content ?? undefined,
      x_handle: body.x_handle ?? undefined,
      admin_notes: body.admin_notes ?? undefined,
      contact_status: body.contact_status ?? undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}
