import { getDbGuard } from '@/lib/db';
import { setDailySnapshotForRobot } from '@/lib/robotStore';
import { getRobotFriendlyState, toRobotDisplayState, toRobotStateRecord } from '@/lib/robotState';
import type { DailyCommandState, DailyOutcome } from '@/types/workflow';

type SyncInput = {
  userId: string;
  robotId: string;
  dayKey: string;
  activeMission: DailyOutcome | null;
  todayStatus: DailyCommandState['status'];
  todayState: DailyCommandState;
};

function sourceFromState(state: DailyCommandState, activeMission: DailyOutcome | null) {
  if (state.status === 'complete' || state.debrief) return 'day_closed';
  if (state.outcomes.some((o) => o.status === 'done' && !String(o.proof_provided || '').trim())) return 'proof_needed';
  if (state.active_focus_block?.status === 'active') return 'active_daily_mission';
  if (activeMission?.status === 'active') return 'active_daily_mission';
  if (activeMission && (activeMission.status === 'planned' || activeMission.status === 'selected')) return 'planned_daily_mission';
  return 'idle_fallback';
}

export async function syncDeskBotStateFromToday(input: SyncInput) {
  setDailySnapshotForRobot(input.robotId, input.todayState);
  const guard = getDbGuard();
  const activeMission = input.activeMission;
  const source = sourceFromState(input.todayState, activeMission);
  const friendly = getRobotFriendlyState(input.userId, input.robotId, input.todayState);
  const record = toRobotStateRecord(friendly);
  const display = toRobotDisplayState(input.robotId, input.todayState, { online: true, last_seen_at: null });
  if (!guard.ok) {
    return { ok: false as const, warning: 'DeskBot sync skipped: db unavailable', state: display };
  }
  const now = new Date().toISOString();
  const compact = {
    user_id: input.userId,
    robot_id: input.robotId,
    day_key: input.dayKey,
    status: display.status,
    source,
    mission_id: activeMission?.id || null,
    mission_title: activeMission?.title || display.mission,
    mission_short_title: display.mission,
    next_move: display.next_move,
    proof_needed: display.proof_needed,
    button_hint: display.button_hint,
    updated_at: now
  };
  const upsertDailyRobot = await guard.supabase.from('daily_robot_state').upsert(compact, { onConflict: 'user_id,robot_id,day_key' });
  if (upsertDailyRobot.error) return { ok: false as const, error: upsertDailyRobot.error.message, state: display };
  const upsertState = await guard.supabase.from('robot_states').upsert({
    user_id: input.userId,
    robot_id: input.robotId,
    status: record.status,
    active_session_id: record.active_session_id,
    active_daily_focus_id: record.active_daily_focus_id,
    current_task: 'Today',
    current_step: display.mission,
    next_action: display.next_move,
    proof_needed: display.proof_needed,
    drift_risk: record.drift_risk,
    last_progress_minutes_ago: record.last_progress_minutes_ago,
    ai_message: display.short_message,
    updated_at: now
  });
  if (upsertState.error) return { ok: false as const, error: upsertState.error.message, state: display };
  return { ok: true as const, state: display, source };
}
