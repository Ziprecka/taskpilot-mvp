import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase admin unavailable.' }, { status: 500 });

  const body = await req.json();
  const payload = {
    user_id: user.id,
    preferred_categories: Array.isArray(body.preferred_categories) ? body.preferred_categories : [],
    common_tools: Array.isArray(body.common_tools) ? body.common_tools : [],
    proof_preferences: Array.isArray(body.proof_preferences) ? body.proof_preferences : [],
    successful_patterns: Array.isArray(body.successful_patterns) ? body.successful_patterns : [],
    updated_at: new Date().toISOString()
  };

  const { error } = await admin.from('user_execution_preferences').upsert(payload, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
