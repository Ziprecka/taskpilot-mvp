import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { getDbGuard } from '@/lib/db';
import {
  getDailySnapshotForRobot,
  getRobotHeartbeatCount,
  getLastRobotHeartbeat,
  isRobotOnline,
  countRobotButtonLikeEvents,
  getLastRobotEvent,
  setDailySnapshotForRobot,
  updateRobotState
} from '@/lib/robotStore';
import { getRobotFriendlyState, toRobotDisplayState, toRobotStateRecord } from '@/lib/robotState';
import type { DailyCommandState } from '@/types/workflow';

function buildMeta(robotId: string) {
  const last = getLastRobotHeartbeat(robotId);
  const lastEvent = getLastRobotEvent(robotId);
  return {
    last_heartbeat_at: last,
    heartbeat_count: getRobotHeartbeatCount(robotId),
    online: isRobotOnline(robotId),
    button_event_count: countRobotButtonLikeEvents(robotId),
    last_event_type: lastEvent?.event_type ?? null,
    last_event_at: lastEvent?.created_at ?? null
  };
}

export async function GET(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const robotId = req.nextUrl.searchParams.get('robot_id');
  if (!robotId) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });

  const memoryDaily = getDailySnapshotForRobot(robotId);
  const lastSeen = getLastRobotHeartbeat(robotId);
  const online = isRobotOnline(robotId);
  const friendly = getRobotFriendlyState(null, robotId, memoryDaily);
  const state = toRobotStateRecord(friendly);
  const display = toRobotDisplayState(robotId, memoryDaily, { online, last_seen_at: lastSeen });
  updateRobotState(robotId, state);

  const guard = getDbGuard();
  if (guard.ok) {
    await guard.supabase.from('robot_states').upsert({
      robot_id: state.robot_id,
      status: state.status,
      active_session_id: state.active_session_id,
      active_daily_focus_id: state.active_daily_focus_id,
      current_task: state.current_task,
      current_step: state.current_step,
      next_action: state.next_action,
      proof_needed: state.proof_needed,
      drift_risk: state.drift_risk,
      last_progress_minutes_ago: state.last_progress_minutes_ago,
      ai_message: state.ai_message,
      updated_at: state.updated_at
    });
  }

  return NextResponse.json({ ok: true, state: display, raw_state: state, meta: buildMeta(robotId) });
}

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });
  const robotId = body.robot_id as string;

  if (body.daily_snapshot && typeof body.daily_snapshot === 'object') {
    setDailySnapshotForRobot(robotId, body.daily_snapshot as DailyCommandState);
  }

  const memoryDaily = getDailySnapshotForRobot(robotId);
  const lastSeen = getLastRobotHeartbeat(robotId);
  const online = isRobotOnline(robotId);
  const friendly = getRobotFriendlyState(null, robotId, memoryDaily);
  const computed = toRobotStateRecord(friendly);
  const state = updateRobotState(robotId, computed);
  const display = toRobotDisplayState(robotId, memoryDaily, { online, last_seen_at: lastSeen });

  const guard = getDbGuard();
  if (guard.ok) {
    await guard.supabase.from('robot_states').upsert({
      robot_id: state.robot_id,
      status: state.status,
      active_session_id: state.active_session_id,
      active_daily_focus_id: state.active_daily_focus_id,
      current_task: state.current_task,
      current_step: state.current_step,
      next_action: state.next_action,
      proof_needed: state.proof_needed,
      drift_risk: state.drift_risk,
      last_progress_minutes_ago: state.last_progress_minutes_ago,
      ai_message: state.ai_message,
      updated_at: state.updated_at
    });
  }
  return NextResponse.json({ ok: true, state: display, raw_state: state, meta: buildMeta(robotId) });
}
