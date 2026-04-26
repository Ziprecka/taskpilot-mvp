import { NextRequest, NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';

export async function GET() {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { data, error } = await guard.supabase.from('daily_focus_blocks').select('*').order('started_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { data, error } = await guard.supabase.from('daily_focus_blocks').insert(body).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { id, ...updates } = await req.json();
  const { data, error } = await guard.supabase.from('daily_focus_blocks').update(updates).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
