import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { data, error } = await guard.supabase.from('ai_message_feedback').insert({
    message_id: body.message_id,
    session_id: body.session_id,
    rating: body.rating,
    comment: body.comment || null,
    user_id: guard.userId
  }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
