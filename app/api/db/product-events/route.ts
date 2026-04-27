import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const admin = getSupabaseAdminClient();
  const userId = await getCurrentUserId();
  if (!admin) return NextResponse.json({ ok: true, local_only: true });
  const { error } = await admin.from('product_events').insert({
    user_id: userId,
    event_type: body?.event_type || 'unknown',
    route: body?.route || '',
    metadata: body?.metadata || {},
    created_at: body?.created_at || new Date().toISOString()
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

