import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { getDbGuard } from '@/lib/db';
import { getRobotHeartbeatCount, getLastRobotHeartbeat, isRobotOnline } from '@/lib/robotStore';
import { DEFAULT_ROBOT_ID } from '@/lib/robotClientSettings';
import { resolveRobotOwner } from '@/lib/robotOwner';

export async function GET(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const robotId = req.nextUrl.searchParams.get('robot_id') || DEFAULT_ROBOT_ID;
  const owner = await resolveRobotOwner(robotId);
  const guard = getDbGuard();
  const state = guard.ok
    ? await guard.supabase.from('robot_states').select('status,current_step,next_action,proof_needed,updated_at').eq('robot_id', robotId).maybeSingle()
    : { data: null };
  const sourceState = guard.ok
    ? await guard.supabase
        .from('daily_robot_state')
        .select('source,updated_at')
        .eq('robot_id', robotId)
        .eq('user_id', owner.userId || '')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const lastHeartbeat = getLastRobotHeartbeat(robotId);
  const online = isRobotOnline(robotId);
  const seconds = lastHeartbeat ? Math.max(0, Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000)) : null;
  return NextResponse.json({
    ok: true,
    robot_id: robotId,
    owner_user_id: owner.userId,
    owner_email: owner.email,
    online,
    last_heartbeat_at: lastHeartbeat,
    seconds_since_heartbeat: seconds,
    heartbeat_count: getRobotHeartbeatCount(robotId),
    source: sourceState.data?.source || null,
    state: state.data
      ? {
          ...(state.data as Record<string, unknown>),
          source: sourceState.data?.source || null
        }
      : null
  });
}
