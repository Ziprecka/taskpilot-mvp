import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json().catch(() => ({}));
  const robotId = String(body?.robot_id || 'atom-s3r-001');
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const [r1, r2] = await Promise.all([
    guard.supabase.from('daily_robot_state').delete().eq('user_id', guard.userId).eq('robot_id', robotId).eq('day_key', today),
    guard.supabase
      .from('robot_states')
      .update({
        status: 'idle',
        current_task: 'Today',
        current_step: 'Plan today',
        next_action: 'Create daily plan',
        proof_needed: 'Start first mission',
        updated_at: now
      })
      .eq('user_id', guard.userId)
      .eq('robot_id', robotId)
  ]);
  if (r1.error) return NextResponse.json({ ok: false, error: r1.error.message }, { status: 500 });
  if (r2.error) return NextResponse.json({ ok: false, error: r2.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cleared: true, updated_at: now });
}
