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
import { getRobotFriendlyState, toRobotDisplayState, toRobotStateRecord, type RobotStateSource } from '@/lib/robotState';
import type { DailyCommandState } from '@/types/workflow';
import { normalizeRobotMission, normalizeRobotNextMove, normalizeRobotProof, normalizeRobotShortMessage } from '@/lib/robotText';
import { resolveRobotOwner } from '@/lib/robotOwner';

/**
 * PowerShell test:
 * Invoke-RestMethod `
 *   -Uri "https://taskpilot.live/api/robot/state?robot_id=atom-s3r-001" `
 *   -Method GET `
 *   -Headers @{ "x-taskpilot-robot-key" = "KEY" }
 */

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

async function getDailyFromDbForOwner(ownerUserId: string): Promise<{ daily: DailyCommandState | null; source: RobotStateSource; workflow_next_action?: string | null }> {
  const guard = getDbGuard();
  if (!guard.ok) return { daily: null, source: 'idle_fallback' };

  const today = new Date().toISOString().slice(0, 10);
  const [focusRes, outcomesRes, reportRes, workflowRes] = await Promise.all([
    guard.supabase
      .from('daily_focus_blocks')
      .select('*')
      .eq('user_id', ownerUserId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase
      .from('daily_outcomes')
      .select('*')
      .eq('user_id', ownerUserId)
      .eq('date', today)
      .order('priority', { ascending: true }),
    guard.supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', ownerUserId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase
      .from('workflow_sessions')
      .select('*')
      .eq('user_id', ownerUserId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const outcomes = (outcomesRes.data || []) as Array<Record<string, unknown>>;
  const activeFocus = focusRes.data as Record<string, unknown> | null;
  const report = reportRes.data as Record<string, unknown> | null;

  let source: RobotStateSource = 'idle_fallback';
  if (activeFocus) source = 'active_daily_mission';
  else if (outcomes.some((o) => o.status === 'active')) source = 'active_today_mission';
  else if (outcomes.some((o) => o.status === 'planned' || o.status === 'selected')) source = 'planned_daily_mission';
  else if (outcomes.some((o) => o.status === 'done' && !String(o.proof_provided || '').trim())) source = 'proof_needed';
  else if (report) source = 'day_closed';
  else if (workflowRes.data) source = 'workflow_fallback';

  if (!outcomes.length && !activeFocus && !workflowRes.data && !report) return { daily: null, source: 'idle_fallback' };

  const mappedOutcomes = outcomes.map((o) => ({
    id: String(o.id || crypto.randomUUID()),
    title: String(o.title || 'Outcome'),
    why_it_matters: String(o.why_it_matters || ''),
    category: (o.category as DailyCommandState['outcomes'][number]['category']) || 'other',
    priority: (o.priority as 1 | 2 | 3) || 1,
    status: (o.status as DailyCommandState['outcomes'][number]['status']) || 'planned',
    estimated_minutes: Number(o.estimated_minutes || 25),
    actual_minutes: Number(o.actual_minutes || 0),
    proof_required: String(o.proof_required || ''),
    proof_provided: String(o.proof_provided || ''),
    first_action: String(o.first_action || ''),
    created_at: String(o.created_at || new Date().toISOString()),
    updated_at: String(o.updated_at || new Date().toISOString()),
    completed_at: o.completed_at ? String(o.completed_at) : null
  }));

  const daily: DailyCommandState = {
    date: today,
    status: report ? 'complete' : 'planning',
    daily_goals: '',
    selected_day_type: null,
    custom_context: '',
    outcomes: mappedOutcomes as DailyCommandState['outcomes'],
    active_outcome_id:
      (activeFocus?.outcome_id as string | undefined) ||
      (mappedOutcomes.find((o) => o.status === 'active')?.id ?? null),
    active_focus_block: activeFocus
      ? {
          id: String(activeFocus.id || crypto.randomUUID()),
          outcome_id: String(activeFocus.outcome_id || ''),
          title: String(activeFocus.title || ''),
          status: 'active',
          started_at: String(activeFocus.started_at || new Date().toISOString()),
          ended_at: activeFocus.ended_at ? String(activeFocus.ended_at) : null,
          planned_minutes: Number(activeFocus.planned_minutes || 25),
          actual_minutes: Number(activeFocus.actual_minutes || 0),
          current_action: String(activeFocus.current_action || ''),
          blocker: String(activeFocus.blocker || ''),
          drift_score: Number(activeFocus.drift_score || 0),
          last_progress_at: String(activeFocus.last_progress_at || new Date().toISOString())
        }
      : null,
    events: [],
    coach_messages: [],
    report: null,
    debrief: report ? ({} as DailyCommandState['debrief']) : null,
    xp_today: 0,
    proof_count_today: mappedOutcomes.filter((o) => !!o.proof_provided).length,
    lessons: [],
    last_saved_at: new Date().toISOString()
  };

  const workflowNextAction = workflowRes.data ? String((workflowRes.data as Record<string, unknown>).ai_next_action || '').trim() : null;
  return { daily, source, workflow_next_action: workflowNextAction };
}

function addCompatFields(
  state: ReturnType<typeof toRobotDisplayState>,
  source: RobotStateSource,
  owner: { userId: string | null; email?: string | null; mapped?: boolean },
  raw?: { mission?: string; next_action?: string; proof?: string; last_synced_at?: string | null }
) {
  const rawMission = raw?.mission || state.mission || 'Plan today';
  const rawNext = raw?.next_action || state.next_move || 'Create daily plan';
  const rawProof = raw?.proof || state.proof_needed || 'Start first mission';
  const mission = normalizeRobotMission(rawMission);
  const next = normalizeRobotNextMove(rawNext);
  const proof = normalizeRobotProof(rawProof);
  return {
    ...state,
    mission,
    next_move: next,
    proof_needed: proof,
    short_message: normalizeRobotShortMessage(state.short_message || 'Stay on this mission.'),
    current_task: 'Today',
    current_step: mission,
    next_action: next,
    source,
    raw_mission: rawMission,
    short_mission: mission,
    raw_next_action: rawNext,
    short_next_action: next,
    raw_proof: rawProof,
    short_proof: proof,
    owner_user_id: owner.userId,
    owner_email: owner.email || null,
    mapping_status: owner.mapped ? 'mapped' : 'unmapped',
    updated_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    last_synced_at: raw?.last_synced_at || null
  };
}

export async function GET(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const robotId = req.nextUrl.searchParams.get('robot_id');
  if (!robotId) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });

  const owner = await resolveRobotOwner(robotId);
  const ownerUserId = owner.userId;
  const memoryDaily = getDailySnapshotForRobot(robotId);
  const guard = getDbGuard();
  const today = new Date().toISOString().slice(0, 10);
  let fallbackReason: string | null = null;
  if (!ownerUserId) fallbackReason = 'robot_id mismatch or owner_user_id mismatch';
  const dailyRobotState = ownerUserId && guard.ok
    ? await guard.supabase
        .from('daily_robot_state')
        .select('*')
        .eq('user_id', ownerUserId)
        .eq('robot_id', robotId)
        .eq('day_key', today)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const latestDailyRobotState = ownerUserId && guard.ok
    ? await guard.supabase
        .from('daily_robot_state')
        .select('*')
        .eq('user_id', ownerUserId)
        .eq('robot_id', robotId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const dbResolved = ownerUserId ? await getDailyFromDbForOwner(ownerUserId) : { daily: null, source: 'idle_fallback' as const, workflow_next_action: null };
  const chosenDaily = dbResolved.daily || memoryDaily;
  let source: RobotStateSource = dbResolved.daily ? dbResolved.source : memoryDaily ? 'active_daily_mission' : 'idle_fallback';
  const lastSeen = getLastRobotHeartbeat(robotId);
  const online = isRobotOnline(robotId);
  const friendly = getRobotFriendlyState(ownerUserId, robotId, chosenDaily);
  const state = toRobotStateRecord(friendly);
  const display = toRobotDisplayState(robotId, chosenDaily, {
    online,
    last_seen_at: lastSeen,
    workflow_fallback_action: source === 'workflow_fallback' ? dbResolved.workflow_next_action || undefined : undefined
  });
  if (dailyRobotState.data) {
    const drs = dailyRobotState.data as Record<string, unknown>;
    const ageMs = Date.now() - new Date(String(drs.updated_at || new Date().toISOString())).getTime();
    if (ageMs <= 24 * 60 * 60 * 1000) {
      source = 'daily_robot_state';
      display.status = String(drs.status || display.status) as typeof display.status;
      display.mission = normalizeRobotMission(String(drs.mission_short_title || drs.mission_title || display.mission));
      display.next_move = normalizeRobotNextMove(String(drs.next_move || display.next_move));
      display.proof_needed = normalizeRobotProof(String(drs.proof_needed || display.proof_needed));
      display.short_message = normalizeRobotShortMessage('Stay on this mission.');
    } else {
      fallbackReason = 'daily_robot_state stale';
    }
  } else if (latestDailyRobotState.data) {
    const drs = latestDailyRobotState.data as Record<string, unknown>;
    const ageMs = Date.now() - new Date(String(drs.updated_at || new Date().toISOString())).getTime();
    if (ageMs <= 24 * 60 * 60 * 1000) {
      source = 'daily_robot_state';
      display.status = String(drs.status || display.status) as typeof display.status;
      display.mission = normalizeRobotMission(String(drs.mission_short_title || drs.mission_title || display.mission));
      display.next_move = normalizeRobotNextMove(String(drs.next_move || display.next_move));
      display.proof_needed = normalizeRobotProof(String(drs.proof_needed || display.proof_needed));
      display.short_message = normalizeRobotShortMessage('Using latest Today mission sync.');
      fallbackReason = 'day_key mismatch';
    } else {
      fallbackReason = 'daily_robot_state stale';
    }
  } else {
    fallbackReason = ownerUserId ? 'no daily_robot_state row' : fallbackReason;
  }
  const persisted = guard.ok
    ? await guard.supabase.from('robot_states').select('status,current_step,next_action,proof_needed,updated_at').eq('robot_id', robotId).maybeSingle()
    : { data: null };
  if (source === 'workflow_fallback' || source === 'idle_fallback') {
    const p = persisted.data as Record<string, unknown> | null;
    const hasPersistedDaily = Boolean(p?.current_step && String(p.current_step) !== 'Plan today');
    if (hasPersistedDaily) {
      source = 'active_daily_mission';
      display.mission = normalizeRobotMission(String(p?.current_step || display.mission));
      display.next_move = normalizeRobotNextMove(String(p?.next_action || display.next_move));
      display.proof_needed = normalizeRobotProof(String(p?.proof_needed || display.proof_needed));
      display.short_message = normalizeRobotShortMessage('Using latest synced Today mission.');
      fallbackReason = null;
    } else if (!fallbackReason) {
      fallbackReason = 'daily state not synced';
    }
  }
  const compat = addCompatFields(display, source, owner, {
    mission: display.mission,
    next_action: display.next_move,
    proof: display.proof_needed,
    last_synced_at: String(
      (dailyRobotState.data as Record<string, unknown> | null)?.updated_at
      || (latestDailyRobotState.data as Record<string, unknown> | null)?.updated_at
      || state.updated_at
    )
  });
  updateRobotState(robotId, state);

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

  return NextResponse.json({
    ok: true,
    state: compat,
    raw_state: state,
    meta: buildMeta(robotId),
    warning: source === 'workflow_fallback' || source === 'idle_fallback' ? 'DeskBot fallback in use. Sync Today state.' : null,
    debug: {
      today_sync_exists: Boolean(dailyRobotState.data),
      latest_sync_exists: Boolean(latestDailyRobotState.data),
      today_sync_updated_at: (dailyRobotState.data as Record<string, unknown> | null)?.updated_at || null,
      latest_sync_updated_at: (latestDailyRobotState.data as Record<string, unknown> | null)?.updated_at || null,
      source_used: source,
      fallback_reason: source === 'workflow_fallback' || source === 'idle_fallback' ? fallbackReason : null
    }
  });
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

  const owner = await resolveRobotOwner(robotId);
  const ownerUserId = owner.userId;
  const memoryDaily = getDailySnapshotForRobot(robotId);
  const lastSeen = getLastRobotHeartbeat(robotId);
  const online = isRobotOnline(robotId);
  const friendly = getRobotFriendlyState(ownerUserId, robotId, memoryDaily);
  const computed = toRobotStateRecord(friendly);
  const state = updateRobotState(robotId, computed);
  const display = toRobotDisplayState(robotId, memoryDaily, { online, last_seen_at: lastSeen });
  const compat = addCompatFields(display, memoryDaily ? 'active_daily_mission' : 'idle_fallback', owner, {
    mission: display.mission,
    next_action: display.next_move,
    proof: display.proof_needed,
    last_synced_at: computed.updated_at
  });

  const guard = getDbGuard();
  if (guard.ok) {
    await guard.supabase.from('robot_states').upsert({
      user_id: ownerUserId || process.env.TASKPILOT_DEFAULT_ROBOT_USER_ID || 'local-dev-user',
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
  return NextResponse.json({ ok: true, state: compat, raw_state: state, meta: buildMeta(robotId) });
}
