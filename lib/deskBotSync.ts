import { syncDeskBotStateFromToday as syncCore } from '@/lib/syncDeskBotState';
import type { DailyCommandState } from '@/types/workflow';

export async function syncDeskBotStateFromToday(userId: string, todayState: DailyCommandState, robotId: string) {
  const activeMission =
    todayState.outcomes.find((o) => o.id === todayState.active_focus_block?.outcome_id) ||
    todayState.outcomes.find((o) => o.status === 'active') ||
    [...todayState.outcomes]
      .filter((o) => o.status === 'planned' || o.status === 'selected')
      .sort((a, b) => a.priority - b.priority)[0] ||
    null;
  return syncCore({
    userId,
    robotId,
    dayKey: todayState.date,
    activeMission,
    todayStatus: todayState.status,
    todayState
  });
}
