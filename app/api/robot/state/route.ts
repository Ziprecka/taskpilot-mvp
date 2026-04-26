import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { getDbGuard } from '@/lib/db';
import { getRobotState, updateRobotState } from '@/lib/robotStore';

export async function GET(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const robotId = req.nextUrl.searchParams.get('robot_id');
  if (!robotId) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });
  const guard = getDbGuard();
  if (guard.ok) {
    const { data } = await guard.supabase.from('robot_states').select('*').eq('robot_id', robotId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return NextResponse.json({ ok: true, state: data });
  }
  const state = getRobotState(robotId);
  if (!state) return NextResponse.json({ ok: false, error: 'Robot state not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, state });
}

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });
  const state = updateRobotState(body.robot_id, body);
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
  return NextResponse.json({ ok: true, state });
}
