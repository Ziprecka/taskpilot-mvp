import { NextRequest, NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';

export async function GET(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const id = req.nextUrl.searchParams.get('id');
  const workflowSlug = req.nextUrl.searchParams.get('workflow_slug');
  let query = guard.supabase.from('workflow_sessions').select('*').order('updated_at', { ascending: false });
  if (!id && !workflowSlug) {
    const { data, error } = await query.limit(50);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  }
  query = query.limit(1);
  if (id) query = query.eq('id', id);
  if (workflowSlug) query = query.eq('workflow_slug', workflowSlug);
  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const payload = { ...body };
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(String(payload.id ?? ''))) delete payload.id;
  const { data, error } = await guard.supabase.from('workflow_sessions').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing session id' }, { status: 400 });
  const { data, error } = await guard.supabase.from('workflow_sessions').update(updates).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
