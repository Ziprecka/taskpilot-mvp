import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { markHeartbeat, updateRobotState } from '@/lib/robotStore';
import { getDbGuard } from '@/lib/db';
import { resolveRobotOwner } from '@/lib/robotOwner';

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id) return NextResponse.json({ ok: false, error: 'Missing robot_id.' }, { status: 400 });
  markHeartbeat(body.robot_id);
  updateRobotState(body.robot_id, { status: body.status ?? 'idle' });
  const guard = getDbGuard();
  if (guard.ok) {
    const owner = await resolveRobotOwner(String(body.robot_id));
    const fallbackUser = owner.userId || process.env.TASKPILOT_DEFAULT_ROBOT_USER_ID || 'local-dev-user';
    await guard.supabase.from('robot_devices').upsert({
      user_id: fallbackUser,
      robot_id: body.robot_id,
      name: body.robot_id,
      device_type: 'custom',
      capabilities: {},
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'robot_id' });
  }
  return NextResponse.json({
    ok: true,
    last_seen_at: new Date().toISOString(),
    next_poll_seconds: 10
  });
}
