import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { addRobotCommand, addRobotEvent, getRobotState } from '@/lib/robotStore';
import { getDbGuard } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id || !body?.event_type) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
  }
  const savedEvent = addRobotEvent({
    robot_id: body.robot_id,
    event_type: body.event_type,
    content: body.content ?? '',
    metadata: body.metadata ?? {}
  });
  const guard = getDbGuard();
  if (guard.ok) {
    await guard.supabase.from('robot_events').insert({
      robot_id: savedEvent.robot_id,
      event_type: savedEvent.event_type,
      content: savedEvent.content,
      metadata: savedEvent.metadata,
      created_at: savedEvent.created_at
    });
  }

  let command = null;
  if (body.event_type === 'checkin_due' || body.event_type === 'button_pressed' || body.event_type === 'voice_command') {
    const state = getRobotState(body.robot_id);
    command = addRobotCommand({
      robot_id: body.robot_id,
      type: 'speak',
      message:
        body.event_type === 'voice_command'
          ? 'Current task: Add robot API routes. Next action: run /api/robot/state and share result.'
          : `Current task: ${state?.current_step ?? 'Add robot API routes'}. What progress can you show?`,
      payload: {}
    });
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
  }

  return NextResponse.json({
    ok: true,
    event_saved: true,
    command
  });
}
