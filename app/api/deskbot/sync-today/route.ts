import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';
import { normalizeRobotMission, normalizeRobotNextMove, normalizeRobotProof } from '@/lib/robotText';

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });
  const body = await req.json();
  const dayKey = String(body?.day_key || new Date().toISOString().slice(0, 10));
  const source = 'active_today_mission';
  const mapped = await guard.supabase
    .from('robot_devices')
    .select('robot_id')
    .eq('user_id', guard.userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const robotId = String(body?.robot_id || mapped.data?.robot_id || 'atom-s3r-001');
  const missionTitle = String(body?.mission_title || 'Plan today');
  const missionShort = normalizeRobotMission(String(body?.mission_short_title || missionTitle));
  const firstAction = String(body?.first_action || body?.next_move || 'Create daily plan');
  const nextMove = normalizeRobotNextMove(String(body?.next_move || firstAction));
  const proofNeeded = normalizeRobotProof(String(body?.proof_needed || 'Start first mission'));
  const status = String(body?.status || 'planned');
  const upsert = await guard.supabase.from('daily_robot_state').upsert(
    {
      user_id: guard.userId,
      robot_id: robotId,
      day_key: dayKey,
      status,
      source,
      mission_id: body?.mission_id || null,
      mission_title: missionTitle,
      mission_short_title: missionShort,
      next_move: nextMove,
      proof_needed: proofNeeded,
      button_hint: String(body?.button_hint || 'Press = check in'),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,robot_id,day_key' }
  );
  if (upsert.error) return NextResponse.json({ ok: false, error: upsert.error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    synced: true,
    state: { source, mission: missionShort, next_move: nextMove, proof_needed: proofNeeded }
  });
}
