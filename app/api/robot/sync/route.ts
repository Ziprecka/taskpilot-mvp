import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';
import { getRobotFriendlyState, toRobotDisplayState, toRobotStateRecord } from '@/lib/robotState';
import type { DailyCommandState } from '@/types/workflow';

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });

  const body = await req.json();
  const robotId = String(body?.robot_id || 'atom-s3r-001');
  const daily = body?.daily_state as DailyCommandState | undefined;
  if (!daily) return NextResponse.json({ ok: false, error: 'Missing daily_state.' }, { status: 400 });

  const friendly = getRobotFriendlyState(guard.userId, robotId, daily);
  const record = toRobotStateRecord(friendly);
  const display = toRobotDisplayState(robotId, daily, { online: true, last_seen_at: null });

  const upsertState = await guard.supabase.from('robot_states').upsert({
    user_id: guard.userId,
    robot_id: robotId,
    status: record.status,
    active_session_id: record.active_session_id,
    active_daily_focus_id: record.active_daily_focus_id,
    current_task: record.current_task,
    current_step: record.current_step,
    next_action: record.next_action,
    proof_needed: record.proof_needed,
    drift_risk: record.drift_risk,
    last_progress_minutes_ago: record.last_progress_minutes_ago,
    ai_message: record.ai_message,
    updated_at: new Date().toISOString()
  });
  if (upsertState.error) return NextResponse.json({ ok: false, error: upsertState.error.message }, { status: 500 });

  await guard.supabase.from('robot_devices').upsert(
    {
      user_id: guard.userId,
      robot_id: robotId,
      name: robotId,
      device_type: 'custom',
      capabilities: {},
      updated_at: new Date().toISOString()
    },
    { onConflict: 'robot_id' }
  );

  return NextResponse.json({
    ok: true,
    sync_status: 'synced',
    state: {
      ...display,
      current_task: 'Today',
      current_step: display.mission,
      next_action: display.next_move
    },
    updated_at: new Date().toISOString()
  });
}
