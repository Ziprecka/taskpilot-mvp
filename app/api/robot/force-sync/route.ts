import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';
import type { DailyCommandState } from '@/types/workflow';
import { syncDeskBotStateFromToday } from '@/lib/syncDeskBotState';

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json().catch(() => ({}));
  const robotId = String(body?.robot_id || 'atom-s3r-001');
  const today = new Date().toISOString().slice(0, 10);
  const [focusRes, outcomesRes, reportRes] = await Promise.all([
    guard.supabase
      .from('daily_focus_blocks')
      .select('*')
      .eq('user_id', guard.userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    guard.supabase.from('daily_outcomes').select('*').eq('user_id', guard.userId).eq('date', today).order('priority', { ascending: true }),
    guard.supabase.from('daily_reports').select('*').eq('user_id', guard.userId).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);
  const outcomes = (outcomesRes.data || []) as Array<Record<string, unknown>>;
  const activeFocus = focusRes.data as Record<string, unknown> | null;
  const report = reportRes.data as Record<string, unknown> | null;
  const daily: DailyCommandState = {
    date: today,
    status: report ? 'complete' : 'planning',
    daily_goals: '',
    selected_day_type: null,
    custom_context: '',
    outcomes: outcomes.map((o) => ({
      id: String(o.id),
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
    })),
    active_outcome_id: (activeFocus?.outcome_id as string | undefined) || (outcomes.find((o) => o.status === 'active')?.id as string | undefined) || null,
    active_focus_block: activeFocus
      ? {
          id: String(activeFocus.id),
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
    proof_count_today: outcomes.filter((o) => String(o.proof_provided || '').trim()).length,
    lessons: [],
    last_saved_at: new Date().toISOString()
  };
  const activeMission =
    daily.outcomes.find((o) => o.id === daily.active_focus_block?.outcome_id) ||
    daily.outcomes.find((o) => o.status === 'active') ||
    [...daily.outcomes].filter((o) => o.status === 'planned' || o.status === 'selected').sort((a, b) => a.priority - b.priority)[0] ||
    null;
  const synced = await syncDeskBotStateFromToday({
    userId: guard.userId,
    robotId,
    dayKey: today,
    activeMission,
    todayStatus: daily.status,
    todayState: daily
  });
  if (!synced.ok) return NextResponse.json({ ok: false, error: synced.error || synced.warning || 'sync failed' }, { status: 500 });
  return NextResponse.json({ ok: true, state: synced.state, source: synced.source || 'daily_robot_state', synced_at: new Date().toISOString() });
}
