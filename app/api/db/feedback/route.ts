import { NextRequest, NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';

export async function GET() {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { data, error } = await guard.supabase.from('feedback_items').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { data, error } = await guard.supabase.from('feedback_items').insert({
    type: body.type,
    severity: body.severity,
    area: body.area,
    description: body.description,
    expected_behavior: body.expected_behavior,
    proof_url: body.proof_url,
    status: body.status || 'open'
  }).select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
