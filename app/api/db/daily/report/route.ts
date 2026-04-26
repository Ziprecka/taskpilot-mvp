import { NextRequest, NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const date = req.nextUrl.searchParams.get('date');
  let query = guard.supabase.from('daily_reports').select('*').order('created_at', { ascending: false }).limit(1);
  if (date) query = query.eq('date', date);
  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { data, error } = await guard.supabase.from('daily_reports').upsert(body).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
