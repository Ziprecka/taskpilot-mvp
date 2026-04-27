import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const date = req.nextUrl.searchParams.get('date');
  let query = guard.supabase.from('daily_outcomes').select('*').eq('user_id', guard.userId).order('priority');
  if (date) query = query.eq('date', date);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { data, error } = await guard.supabase.from('daily_outcomes').upsert({ ...body, user_id: guard.userId }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id, ...updates } = await req.json();
  const { data, error } = await guard.supabase.from('daily_outcomes').update(updates).eq('id', id).eq('user_id', guard.userId).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
