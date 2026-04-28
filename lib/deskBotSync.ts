import { getDbGuard } from '@/lib/db';
import { setDailySnapshotForRobot } from '@/lib/robotStore';
import { getRobotFriendlyState, toRobotStateRecord, toRobotDisplayState } from '@/lib/robotState';
import type { DailyCommandState } from '@/types/workflow';

export async function syncDeskBotStateFromToday(userId: string, todayState: DailyCommandState, robotId: string) {
  setDailySnapshotForRobot(robotId, todayState);
  const friendly = getRobotFriendlyState(userId, robotId, todayState);
  const record = toRobotStateRecord(friendly);
  const display = toRobotDisplayState(robotId, todayState, { online: true, last_seen_at: null });
  const guard = getDbGuard();
  if (!guard.ok) {
    return { ok: false as const, error: 'Database unavailable', state: display };
  }
  const upsert = await guard.supabase.from('robot_states').upsert({
    user_id: userId,
    robot_id: robotId,
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
    updated_at: new Date().toISOString()
  });
  if (upsert.error) return { ok: false as const, error: upsert.error.message, state: display };
  return { ok: true as const, state: display };
}
