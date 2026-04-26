import { NextRequest, NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });
  const { data, error } = await guard.supabase.from('ai_messages').select('*').eq('session_id', sessionId).order('created_at');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { data, error } = await guard.supabase.from('ai_messages').insert(body).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
