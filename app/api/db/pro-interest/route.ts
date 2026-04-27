import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const admin = getSupabaseAdminClient();
  const userId = await getCurrentUserId();
  if (!admin) return NextResponse.json({ ok: true, local_only: true });
  const { error } = await admin.from('pro_interest').insert({
    user_id: userId,
    email: body?.email || null,
    feature: body?.feature || 'general',
    created_at: new Date().toISOString()
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

