/**
 * Converts Daily Command Center JSON into DeskBot-safe display strings (Atom S3R limits).
 */

import type { DailyCommandState, DailyOutcome } from '@/types/workflow';
import type { RobotDisplayState, RobotState } from '@/types/robot';
import {
  normalizeRobotMission,
  normalizeRobotNextMove,
  normalizeRobotProof,
  normalizeRobotShortMessage,
  truncateRobotText
} from '@/lib/robotText';

/** API-facing statuses for Atom / DeskBot UI */
export type RobotDeskDisplayStatus =
  | 'planned'
  | 'focused'
  | 'waiting_for_proof'
  | 'blocked'
  | 'idle'
  | 'complete';

export type RobotStateSource =
  | 'active_daily_mission'
  | 'active_today_mission'
  | 'planned_daily_mission'
  | 'proof_needed'
  | 'day_closed'
  | 'workflow_fallback'
  | 'idle_fallback';

export function truncate(s: string, max: number): string {
  return truncateRobotText(s, max);
}

function driftLevel(drift: number | undefined): 'low' | 'medium' | 'high' {
  const d = drift ?? 0;
  if (d > 7) return 'high';
  if (d > 3) return 'medium';
  return 'low';
}

function minutesBetween(iso: string | undefined | null): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

/** Pick priority outcome row for robot context */
function pickMissionOutcome(state: DailyCommandState): DailyOutcome | null {
  const list = [...(state.outcomes ?? [])];
  const activeFocus = state.active_focus_block;
  if (activeFocus?.outcome_id) {
    const byFocus = list.find((o) => o.id === activeFocus.outcome_id);
    if (byFocus && byFocus.status !== 'done') return byFocus;
  }
  const active = list.find((o) => o.status === 'active');
  if (active) return active;
  const planned = list
    .filter((o) => o.status === 'planned' || o.status === 'selected')
    .sort((a, b) => (b.leverage_score ?? 0) - (a.leverage_score ?? 0))[0];
  return planned ?? null;
}

function deriveDeskStatus(state: DailyCommandState, mission: DailyOutcome | null): RobotDeskDisplayStatus {
  const outcomes = state.outcomes ?? [];
  if (state.status === 'complete' || (!!state.debrief && outcomes.length > 0 && outcomes.every((o) => o.status === 'done'))) {
    return 'complete';
  }
  const needsProof = outcomes.some((o) => o.status === 'done' && !o.proof_provided?.trim() && !!o.proof_required?.trim());
  if (needsProof) return 'waiting_for_proof';
  if (outcomes.some((o) => o.status === 'blocked')) return 'blocked';
  if (state.active_focus_block?.status === 'active') return 'focused';
  if (!outcomes.length) return 'idle';
  if (mission && mission.status === 'active' && !mission.proof_provided?.trim() && mission.proof_required?.trim()) {
    return 'waiting_for_proof';
  }
  if (outcomes.some((o) => o.status === 'planned' || o.status === 'selected')) return 'planned';
  if (outcomes.some((o) => o.status !== 'done' && o.status !== 'skipped')) return 'focused';
  return 'idle';
}

function nextActionLine(state: DailyCommandState, mission: DailyOutcome | null): string {
  const hint = state.plan_next_move_hint;
  if (hint?.do) return hint.do;
  if (state.active_focus_block?.status === 'active' && state.active_focus_block.current_action) {
    return state.active_focus_block.current_action;
  }
  if (mission?.first_action) return mission.first_action;
  if (!(state.outcomes ?? []).length) return 'Create daily plan';
  return 'Start mission now';
}

function proofLine(mission: DailyOutcome | null): string {
  if (!mission) return '';
  return mission.proof_required?.trim() || '';
}

function aiLine(status: RobotDeskDisplayStatus, mission: DailyOutcome | null, nextAction: string): string {
  switch (status) {
    case 'complete':
      return 'Day closed. Review debrief or plan tomorrow.';
    case 'blocked':
      return 'Resolve blocker in TaskPilot, then retry focus.';
    case 'focused':
      return `Focus: ${truncate(mission?.title ?? 'mission', 40)}`;
    case 'planned':
      return 'Start the planned mission now.';
    case 'waiting_for_proof':
      return 'Log proof for current mission before marking done.';
    case 'idle':
      return 'Open Daily — write goals and tap Accept plan.';
    default:
      return truncate(nextAction, 80);
  }
}

function getMissionBySource(
  daily: DailyCommandState
): { source: RobotStateSource; mission: DailyOutcome | null } {
  const outcomes = [...(daily.outcomes || [])];
  const activeFocus = daily.active_focus_block;
  if (activeFocus?.status === 'active' && activeFocus.outcome_id) {
    const focusMission = outcomes.find((o) => o.id === activeFocus.outcome_id) || null;
    if (focusMission) return { source: 'active_daily_mission', mission: focusMission };
  }
  const active = outcomes.find((o) => o.status === 'active') || null;
  if (active) return { source: 'active_today_mission', mission: active };
  const planned = outcomes
    .filter((o) => o.status === 'planned' || o.status === 'selected')
    .sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (b.leverage_score ?? 0) - (a.leverage_score ?? 0))[0] || null;
  if (planned) return { source: 'planned_daily_mission', mission: planned };
  const proofNeeded = outcomes.find((o) => o.status === 'done' && !String(o.proof_provided || '').trim()) || null;
  if (proofNeeded) return { source: 'proof_needed', mission: proofNeeded };
  if (daily.status === 'complete' || daily.debrief) return { source: 'day_closed', mission: null };
  return { source: 'idle_fallback', mission: null };
}

function modeFromSource(source: RobotStateSource): RobotDisplayState['mode'] {
  if (source === 'active_daily_mission' || source === 'active_today_mission') return 'focus';
  if (source === 'planned_daily_mission') return 'planned';
  if (source === 'proof_needed') return 'focus';
  if (source === 'day_closed') return 'complete';
  return 'idle';
}

function statusFromSource(source: RobotStateSource): RobotDeskDisplayStatus {
  if (source === 'active_daily_mission' || source === 'active_today_mission') return 'focused';
  if (source === 'planned_daily_mission') return 'planned';
  if (source === 'proof_needed') return 'waiting_for_proof';
  if (source === 'day_closed') return 'complete';
  return 'idle';
}

function buildCommandLines(
  daily: DailyCommandState | null,
  source: RobotStateSource,
  mission: DailyOutcome | null,
  workflowFallbackAction?: string
): { source: RobotStateSource; mission: string; next_move: string; proof_needed: string; short_message: string } {
  if (!daily) {
    if (workflowFallbackAction?.trim()) {
      return {
        source: 'workflow_fallback' as RobotStateSource,
        mission: workflowFallbackAction,
        next_move: 'Start mission',
        proof_needed: 'Log mission proof',
        short_message: 'Start current workflow step.'
      };
    }
    return {
      source: 'idle_fallback' as RobotStateSource,
      mission: 'Plan today',
      next_move: 'Create daily plan',
      proof_needed: 'Start first mission',
      short_message: 'Open TaskPilot and plan today.'
    };
  }
  if (source === 'day_closed') {
    return {
      source,
      mission: 'Day complete',
      next_move: 'Review report',
      proof_needed: 'Plan tomorrow',
      short_message: 'Close strong by planning tomorrow.'
    };
  }
  if (source === 'proof_needed') {
    return {
      source,
      mission: mission?.short_title || mission?.title || 'Proof needed',
      next_move: 'Log proof',
      proof_needed: mission?.proof_required || 'Capture required proof',
      short_message: 'Proof is required before moving on.'
    };
  }
  if (source === 'planned_daily_mission') {
    return {
      source,
      mission: mission?.short_title || mission?.title || 'Planned mission',
      next_move: 'Start mission',
      proof_needed: mission?.proof_required || 'Log mission proof',
      short_message: 'Start the highest-priority mission.'
    };
  }
  if (source === 'active_daily_mission' || source === 'active_today_mission') {
    return {
      source,
      mission: mission?.short_title || mission?.title || 'Active mission',
      next_move: daily.active_focus_block?.current_action || mission?.first_action || mission?.checklist?.[0] || 'Execute current step',
      proof_needed: mission?.proof_required || 'Log mission proof',
      short_message: 'Stay on this mission.'
    };
  }
  return {
    source: workflowFallbackAction?.trim() ? 'workflow_fallback' : 'idle_fallback',
    mission: workflowFallbackAction?.trim() || 'Plan today',
    next_move: workflowFallbackAction?.trim() ? 'Start mission' : 'Create daily plan',
    proof_needed: workflowFallbackAction?.trim() ? 'Log mission proof' : 'Start first mission',
    short_message: workflowFallbackAction?.trim() ? 'Workflow fallback in use.' : 'Open TaskPilot and plan today.'
  };
}

function applyPressureRules(
  daily: DailyCommandState | null,
  source: RobotStateSource,
  mission: DailyOutcome | null,
  lines: { mission: string; next_move: string; proof_needed: string; short_message: string }
) {
  let pressure: 'low' | 'normal' | 'high' = 'normal';
  let status = statusFromSource(source);
  let nextMove = lines.next_move;
  if (!daily) return { pressure, status, nextMove };
  const focus = daily.active_focus_block;
  if (focus?.status === 'active') {
    const elapsed = minutesBetween(focus.started_at);
    if (elapsed > (focus.planned_minutes || 25)) {
      pressure = 'high';
      nextMove = 'Finish or log blocker';
    }
  }
  const hasDoneWithoutProof = (daily.outcomes || []).some((o) => o.status === 'done' && !String(o.proof_provided || '').trim());
  if (hasDoneWithoutProof) {
    status = 'waiting_for_proof';
    nextMove = 'Log proof now';
  }
  const lastProgress = minutesBetween(daily.active_focus_block?.last_progress_at || mission?.updated_at || daily.last_saved_at);
  if (lastProgress >= 25 && (source === 'active_daily_mission' || source === 'active_today_mission')) {
    pressure = 'high';
    nextMove = 'Check in or block';
  }
  return { pressure, status, nextMove };
}

export type RobotFriendlyPayload = Omit<
  RobotState,
  'robot_id' | 'updated_at' | 'status' | 'active_session_id' | 'active_daily_focus_id'
> & {
  robot_id: string;
  status: RobotDeskDisplayStatus;
  active_session_id: string | null;
  active_daily_focus_id: string | null;
};

/**
 * Convert Daily JSON into truncated robot-facing fields.
 * userId reserved for future multi-tenant scope.
 */
export function getRobotFriendlyState(_userId: string | null | undefined, robotId: string, daily: DailyCommandState | null): RobotFriendlyPayload {
  if (!daily) {
    return {
      robot_id: robotId,
      status: 'idle',
      active_session_id: null,
      active_daily_focus_id: null,
      current_task: truncate('Today', 24),
      current_step: truncate('Plan today', 24),
      next_action: truncate('Create daily plan', 36),
      proof_needed: truncate('Start first mission', 36),
      drift_risk: 'low',
      last_progress_minutes_ago: 999,
      ai_message: truncate('Open TaskPilot and plan today.', 80)
    };
  }

  const picked = getMissionBySource(daily);
  const lines = buildCommandLines(daily, picked.source, picked.mission);
  const pressure = applyPressureRules(daily, picked.source, picked.mission, lines);

  const current_task = truncate('Today', 24);
  const current_step = truncate(lines.mission, 24);
  const next_action = truncate(pressure.nextMove, 36);
  const proof_needed = truncate(lines.proof_needed, 36);

  const driftSource = daily?.active_focus_block?.drift_score ?? 0;
  const drift_risk = driftLevel(driftSource);

  const lastIso =
    daily.active_focus_block?.last_progress_at ||
    picked.mission?.updated_at ||
    picked.mission?.created_at ||
    daily.last_saved_at;
  const last_progress_minutes_ago = minutesBetween(lastIso);

  const ai_message = truncate(lines.short_message, 80);

  return {
    robot_id: robotId,
    status: pressure.status,
    active_session_id: null,
    active_daily_focus_id: daily.active_focus_block?.id ?? null,
    current_task,
    current_step,
    next_action,
    proof_needed,
    drift_risk,
    last_progress_minutes_ago,
    ai_message
  };
}

function chooseMode(status: RobotDisplayState['status']): RobotDisplayState['mode'] {
  if (status === 'complete') return 'complete';
  if (status === 'blocked') return 'blocked';
  if (status === 'planned') return 'planned';
  if (status === 'focused' || status === 'waiting_for_proof') return 'focus';
  return 'idle';
}

export function toRobotDisplayState(
  robotId: string,
  daily: DailyCommandState | null,
  opts?: { online?: boolean; last_seen_at?: string | null; workflow_fallback_action?: string }
): RobotDisplayState {
  const picked = daily ? getMissionBySource(daily) : { source: 'idle_fallback' as RobotStateSource, mission: null };
  const lines = buildCommandLines(daily, picked.source, picked.mission, opts?.workflow_fallback_action);
  const pressure = applyPressureRules(daily, lines.source, picked.mission, lines);
  const isOffline = opts?.online === false;
  const status: RobotDisplayState['status'] = isOffline ? 'offline' : (pressure.status as RobotDisplayState['status']);
  const urgency: RobotDisplayState['urgency'] = status === 'blocked' ? 'high' : status === 'planned' ? 'normal' : 'normal';
  const mission = normalizeRobotMission(lines.mission);
  const next_move = normalizeRobotNextMove(pressure.nextMove);
  const proof_needed = normalizeRobotProof(lines.proof_needed);
  const short_message = normalizeRobotShortMessage(
    isOffline ? 'DeskBot offline. Open app and check heartbeat.' : lines.short_message || 'Stay on this mission.'
  );
  return {
    robot_id: robotId,
    status,
    mode: chooseMode(status),
    mission,
    next_move,
    proof_needed,
    short_message,
    last_seen_at: opts?.last_seen_at ?? null,
    button_hint: 'Press = check in',
    urgency,
    pressure_level: pressure.pressure
  };
}

/** Merge friendly payload into full RobotState for persistence */
export function toRobotStateRecord(payload: RobotFriendlyPayload): RobotState {
  return {
    robot_id: payload.robot_id,
    status: payload.status as RobotState['status'],
    active_session_id: payload.active_session_id,
    active_daily_focus_id: payload.active_daily_focus_id,
    current_task: payload.current_task,
    current_step: payload.current_step,
    next_action: payload.next_action,
    proof_needed: payload.proof_needed,
    drift_risk: payload.drift_risk,
    last_progress_minutes_ago: payload.last_progress_minutes_ago,
    ai_message: payload.ai_message,
    updated_at: new Date().toISOString()
  };
}
