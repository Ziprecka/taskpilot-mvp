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
  | 'focused'
  | 'waiting_for_proof'
  | 'blocked'
  | 'idle'
  | 'complete';

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
  if (!(state.outcomes ?? []).length) return 'Plan today in TaskPilot.';
  return 'Start focus on the current mission in TaskPilot.';
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
    case 'waiting_for_proof':
      return 'Log proof for current mission before marking done.';
    case 'idle':
      return 'Open Daily — write goals and tap Accept plan.';
    default:
      return truncate(nextAction, 80);
  }
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
      current_task: truncate('Daily Command Center', 24),
      current_step: truncate('No plan yet', 32),
      next_action: truncate('Plan today in TaskPilot.', 48),
      proof_needed: truncate('', 48),
      drift_risk: 'low',
      last_progress_minutes_ago: 999,
      ai_message: truncate('Open Daily and save your execution plan.', 80)
    };
  }

  const mission = pickMissionOutcome(daily);
  const status = deriveDeskStatus(daily, mission);

  const current_task = truncate('Daily Command Center', 24);
  const current_step = truncate(mission?.short_title || mission?.title || (daily.outcomes?.length ? 'Today plan' : 'No plan'), 32);

  let next_action = truncate(nextActionLine(daily!, mission), 48);
  if (!daily?.outcomes?.length) {
    next_action = truncate('Plan today in TaskPilot.', 48);
  }

  const proof_needed = truncate(proofLine(mission), 48);

  const driftSource = daily?.active_focus_block?.drift_score ?? 0;
  const drift_risk = driftLevel(driftSource);

  const lastIso =
    daily.active_focus_block?.last_progress_at ||
    mission?.updated_at ||
    mission?.created_at ||
    daily.last_saved_at;
  const last_progress_minutes_ago = minutesBetween(lastIso);

  const ai_message = truncate(aiLine(status, mission, next_action), 80);

  return {
    robot_id: robotId,
    status,
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
  if (status === 'waiting_for_proof') return 'proof';
  if (status === 'focused' || status === 'blocked') return 'mission';
  return 'status';
}

export function toRobotDisplayState(
  robotId: string,
  daily: DailyCommandState | null,
  opts?: { online?: boolean; last_seen_at?: string | null }
): RobotDisplayState {
  const friendly = getRobotFriendlyState(null, robotId, daily);
  const isOffline = opts?.online === false;
  const status: RobotDisplayState['status'] = isOffline ? 'offline' : (friendly.status as RobotDisplayState['status']);
  const mission = normalizeRobotMission(friendly.current_step || 'Today mission');
  const next_move = normalizeRobotNextMove(
    !daily?.outcomes?.length ? 'Plan today.' : friendly.next_action || 'Continue mission'
  );
  const proof_needed = normalizeRobotProof(friendly.proof_needed || 'Log proof in app');
  const short_message = normalizeRobotShortMessage(
    isOffline ? 'DeskBot offline. Open app and check heartbeat.' : friendly.ai_message || 'Stay on current mission.'
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
    button_hint: 'Press = check in'
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
