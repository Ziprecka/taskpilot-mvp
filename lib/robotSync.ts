'use client';

import type { DailyCommandState } from '@/types/workflow';
import { normalizeRobotMission, normalizeRobotNextMove, normalizeRobotProof } from '@/lib/robotText';

export async function syncDeskBotStateFromToday(userId: string | null, dailyState: DailyCommandState, robotId: string, reason?: string) {
  if (!dailyState || !robotId) return { ok: false as const, reason: 'missing_input' };
  try {
    const res = await fetch('/api/robot/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, robot_id: robotId, daily_state: dailyState, reason: reason || 'state_change' })
    });
    const data = await res.json();
    return { ok: Boolean(data?.ok), data };
  } catch {
    return { ok: false as const, reason: 'network_error' };
  }
}

function activeMissionFromDaily(state: DailyCommandState) {
  return (
    state.outcomes.find((o) => o.id === state.active_focus_block?.outcome_id) ||
    state.outcomes.find((o) => o.status === 'active') ||
    [...state.outcomes]
      .filter((o) => o.status === 'planned' || o.status === 'selected')
      .sort((a, b) => a.priority - b.priority)[0] ||
    null
  );
}

function mapStatus(state: DailyCommandState): 'idle' | 'planned' | 'focused' | 'waiting_for_proof' | 'blocked' | 'complete' {
  if (state.status === 'complete' || state.debrief) return 'complete';
  if (state.outcomes.some((o) => o.status === 'done' && !String(o.proof_provided || '').trim())) return 'waiting_for_proof';
  if (state.outcomes.some((o) => o.status === 'blocked')) return 'blocked';
  if (state.active_focus_block?.status === 'active') return 'focused';
  if (state.outcomes.some((o) => o.status === 'planned' || o.status === 'selected')) return 'planned';
  return 'idle';
}

export async function syncTodayDeskBotPayload(dailyState: DailyCommandState, robotId: string) {
  const mission = activeMissionFromDaily(dailyState);
  const firstAction = dailyState.active_focus_block?.current_action || mission?.first_action || mission?.checklist?.[0] || 'Create daily plan';
  const payload = {
    robot_id: robotId,
    day_key: dailyState.date,
    status: mapStatus(dailyState),
    mission_id: mission?.id || null,
    mission_title: mission?.title || 'Plan today',
    mission_short_title: normalizeRobotMission(mission?.short_title || mission?.title || 'Plan today'),
    first_action: firstAction,
    next_move: normalizeRobotNextMove(firstAction),
    proof_needed: normalizeRobotProof(mission?.proof_required || 'Start first mission'),
    button_hint: 'Press = check in',
    source: 'active_today_mission'
  };
  try {
    const res = await fetch('/api/deskbot/sync-today', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: Boolean(data?.ok), data };
  } catch {
    return { ok: false as const, reason: 'network_error' };
  }
}
