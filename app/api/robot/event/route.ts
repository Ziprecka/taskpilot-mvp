import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import {
  addRobotCommand,
  addRobotEvent,
  getDailySnapshotForRobot,
  getLastRobotHeartbeat,
  isRobotOnline,
  getRobotState,
  updateRobotState
} from '@/lib/robotStore';
import { getDbGuard } from '@/lib/db';
import { getRobotFriendlyState, toRobotDisplayState, truncate, type RobotDeskDisplayStatus } from '@/lib/robotState';
import type { RobotCommandType, RobotEvent } from '@/types/robot';
import { normalizeRobotMission, normalizeRobotNextMove, normalizeRobotProof } from '@/lib/robotText';
import { resolveRobotOwner } from '@/lib/robotOwner';

function replyFromSnapshot(robotId: string): {
  message: string;
  status: RobotDeskDisplayStatus;
  next_move: string;
  proof_needed: string;
} {
  const snap = getDailySnapshotForRobot(robotId);
  const f = getRobotFriendlyState(null, robotId, snap);
  return {
    message: truncate(f.ai_message, 60),
    status: f.status,
    next_move: truncate(f.next_action, 36),
    proof_needed: truncate(f.proof_needed, 36)
  };
}

async function markActiveMissionBlocked(ownerUserId: string | null, note: string) {
  if (!ownerUserId) return false;
  const guard = getDbGuard();
  if (!guard.ok) return false;
  const today = new Date().toISOString().slice(0, 10);
  const active = await guard.supabase
    .from('daily_outcomes')
    .select('id')
    .eq('user_id', ownerUserId)
    .eq('date', today)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (!active.data?.id) return false;
  const now = new Date().toISOString();
  await guard.supabase.from('daily_outcomes').update({ status: 'blocked', blocker_note: note, updated_at: now }).eq('id', active.data.id);
  await guard.supabase
    .from('daily_focus_blocks')
    .update({ status: 'blocked', blocker: note, ended_at: now, last_progress_at: now })
    .eq('user_id', ownerUserId)
    .eq('status', 'active');
  return true;
}

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id || !body?.event_type) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
  }
  const robotId = body.robot_id as string;
  const eventType = body.event_type as string;

  const savedEvent = addRobotEvent({
    robot_id: robotId,
    event_type: eventType as RobotEvent['event_type'],
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

  const base = replyFromSnapshot(robotId);
  let robot_reply = { ...base };
  let lastCommand: ReturnType<typeof addRobotCommand> | null = null;

  function queue(type: RobotCommandType, message: string) {
    const command = addRobotCommand({
      robot_id: robotId,
      type,
      message,
      payload: { source_event: eventType }
    });
    if (guard.ok) {
      void guard.supabase.from('robot_commands').insert({
        robot_id: command.robot_id,
        type: command.type,
        message: command.message,
        payload: command.payload,
        status: command.status,
        created_at: command.created_at
      });
    }
    return command;
  }

  const owner = await resolveRobotOwner(robotId);
  const ownerUserId = owner.userId;
  switch (eventType) {
    case 'button_pressed':
      robot_reply = {
        message: 'Check-in received.',
        status: base.status,
        next_move: base.next_move,
        proof_needed: base.proof_needed
      };
      lastCommand = queue('show_status', truncate(base.next_move, 80));
      break;
    case 'long_press':
      await markActiveMissionBlocked(ownerUserId, 'DeskBot long press blocked');
      robot_reply = {
        message: 'Blocked noted. Open TaskPilot.',
        status: 'blocked',
        next_move: 'Open blocker',
        proof_needed: 'Describe blocker'
      };
      lastCommand = queue('blocked_prompt', 'Long press: log blocker in TaskPilot.');
      break;
    case 'double_press':
      robot_reply = {
        message: 'Proof required',
        status: 'waiting_for_proof',
        next_move: 'Log proof',
        proof_needed: base.proof_needed
      };
      lastCommand = queue('request_proof', 'Double tap: log proof now.');
      break;
    case 'checkin_due': {
      const brief = getRobotFriendlyState(null, robotId, getDailySnapshotForRobot(robotId));
      robot_reply = {
        message: truncate(`Check-in: ${brief.next_action}`, 120),
        status: brief.status,
        next_move: brief.next_action,
        proof_needed: brief.proof_needed
      };
      lastCommand = queue('daily_briefing', truncate(brief.ai_message || brief.next_action, 80));
      break;
    }
    case 'blocked':
      await markActiveMissionBlocked(ownerUserId, 'DeskBot blocked event');
      updateRobotState(robotId, { status: 'blocked' });
      robot_reply = {
        message: 'Blocked noted. Open TaskPilot.',
        status: 'blocked',
        next_move: 'Open blocker',
        proof_needed: 'Describe blocker'
      };
      lastCommand = queue('blocked_prompt', 'Blocked event received.');
      break;
    case 'proof_request':
      robot_reply = {
        message: 'Proof required',
        status: 'waiting_for_proof',
        next_move: 'Log proof',
        proof_needed: base.proof_needed
      };
      lastCommand = queue('request_proof', 'Proof request.');
      break;
    case 'voice_command':
      robot_reply = {
        message: truncate(`Voice: ${base.next_move}`, 120),
        status: base.status,
        next_move: base.next_move,
        proof_needed: base.proof_needed
      };
      lastCommand = queue('speak', truncate(base.next_move, 80));
      break;
    default:
      lastCommand = queue('speak', truncate(base.next_move, 80));
      break;
  }

  const state = getRobotState(robotId);
  const snapshot = getDailySnapshotForRobot(robotId);
  const displayState = toRobotDisplayState(robotId, snapshot, {
    online: isRobotOnline(robotId),
    last_seen_at: getLastRobotHeartbeat(robotId)
  });
  const compatState = {
    ...displayState,
    current_task: 'Today',
    current_step: normalizeRobotMission(displayState.mission),
    next_action: normalizeRobotNextMove(displayState.next_move),
    proof_needed: normalizeRobotProof(displayState.proof_needed)
  };
  return NextResponse.json({
    ok: true,
    event_saved: true,
    robot_reply,
    command: lastCommand,
    state: compatState,
    state_snapshot: state
      ? {
          current_step: state.current_step,
          next_action: state.next_action,
          proof_needed: state.proof_needed
        }
      : null
  });
}
