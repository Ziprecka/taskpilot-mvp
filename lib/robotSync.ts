'use client';

import type { DailyCommandState } from '@/types/workflow';

export async function syncRobotRelevantDailyState(userId: string | null, dailyState: DailyCommandState, robotId: string) {
  if (!dailyState || !robotId) return { ok: false as const, reason: 'missing_input' };
  try {
    const res = await fetch('/api/robot/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, robot_id: robotId, daily_state: dailyState })
    });
    const data = await res.json();
    return { ok: Boolean(data?.ok), data };
  } catch {
    return { ok: false as const, reason: 'network_error' };
  }
}
