import { NextRequest, NextResponse } from 'next/server';
import { getDbGuard } from '@/lib/db';

export async function GET() {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const { data, error } = await guard.supabase.from('workflows').select('*, workflow_steps(*)').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const guard = getDbGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const { steps = [], ...workflow } = body;
  const workflowInsert = await guard.supabase.from('workflows').upsert(workflow, { onConflict: 'slug' }).select('*').single();
  if (workflowInsert.error) return NextResponse.json({ ok: false, error: workflowInsert.error.message }, { status: 500 });
  if (Array.isArray(steps) && steps.length) {
    const rows = steps.map((step: any) => ({ ...step, workflow_id: workflowInsert.data.id }));
    await guard.supabase.from('workflow_steps').delete().eq('workflow_id', workflowInsert.data.id);
    await guard.supabase.from('workflow_steps').insert(rows);
  }
  return NextResponse.json({ ok: true, data: workflowInsert.data });
}
