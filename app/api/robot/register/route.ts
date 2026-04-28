import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { getDbGuard } from '@/lib/db';
import { registerRobot } from '@/lib/robotStore';

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id || !body?.name || !body?.device_type || !body?.capabilities) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
  }
  const robot = registerRobot({
    robot_id: body.robot_id,
    name: body.name,
    device_type: body.device_type,
    capabilities: body.capabilities
  });
  const guard = getDbGuard();
  if (guard.ok) {
    const fallbackUser = process.env.TASKPILOT_DEFAULT_ROBOT_USER_ID || 'local-dev-user';
    await guard.supabase.from('robot_devices').upsert({
      user_id: fallbackUser,
      robot_id: robot.robot_id,
      name: robot.name,
      device_type: robot.device_type,
      capabilities: robot.capabilities,
      last_seen_at: robot.last_seen_at
    }, { onConflict: 'robot_id' });
  }
  return NextResponse.json({ ok: true, robot, message: 'Robot registered.' });
}
