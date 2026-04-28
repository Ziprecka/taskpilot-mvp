import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { acknowledgeRobotCommand, addRobotCommand, getPendingRobotCommand } from '@/lib/robotStore';
import { getDbGuard } from '@/lib/db';
import type { RobotCommandType } from '@/types/robot';

function defaultCommandMessage(type: RobotCommandType): string {
  switch (type) {
    case 'speak':
      return 'DeskBot update.';
    case 'show_status':
      return 'Show status on display.';
    case 'request_proof':
      return 'Log proof for current mission.';
    case 'blocked_prompt':
      return 'What is blocking you? Fix in TaskPilot.';
    case 'daily_briefing':
      return 'Daily briefing: open TaskPilot Daily.';
    case 'capture_proof':
      return 'Capture proof.';
    case 'gesture':
      return 'Gesture cue.';
    case 'start_focus':
      return 'Start focus block.';
    case 'stop_focus':
      return 'Pause focus.';
    case 'check_in':
      return 'Check-in due.';
    default:
      return 'Robot command.';
  }
}

export async function GET(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const robotId = req.nextUrl.searchParams.get('robot_id');
  if (!robotId) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });
  const guard = getDbGuard();
  if (guard.ok) {
    const { data } = await guard.supabase.from('robot_commands').select('*').eq('robot_id', robotId).eq('status', 'pending').order('created_at').limit(1).maybeSingle();
    return NextResponse.json({ ok: true, command: data ?? null });
  }
  return NextResponse.json({ ok: true, command: getPendingRobotCommand(robotId) });
}

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id || !body?.type) {
    return NextResponse.json({ ok: false, error: 'Missing robot_id or type.' }, { status: 400 });
  }
  const ctype = body.type as RobotCommandType;
  const message =
    typeof body.message === 'string' && body.message.trim().length > 0 ? body.message : defaultCommandMessage(ctype);
  const command = addRobotCommand({
    robot_id: body.robot_id,
    type: ctype,
    message,
    payload: body.payload ?? {}
  });
  const guard = getDbGuard();
  if (guard.ok) {
    await guard.supabase.from('robot_commands').insert({
      robot_id: command.robot_id,
      type: command.type,
      message: command.message,
      payload: command.payload,
      status: command.status,
      created_at: command.created_at
    });
  }
  return NextResponse.json({ ok: true, command });
}

export async function PATCH(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.command_id || !body?.status) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
  }
  const command = acknowledgeRobotCommand(body.command_id, body.status);
  const guard = getDbGuard();
  if (guard.ok) {
    await guard.supabase.from('robot_commands').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.command_id);
  }
  return NextResponse.json({ ok: true, command });
}
