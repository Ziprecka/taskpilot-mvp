import { NextRequest, NextResponse } from 'next/server';
import { validateRobotRequest } from '@/lib/robotAuth';
import { getRobotState } from '@/lib/robotStore';

export async function POST(req: NextRequest) {
  const auth = validateRobotRequest(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  const body = await req.json();
  if (!body?.robot_id || !body?.session_id) {
    return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
  }
  const state = getRobotState(body.robot_id);
  const step = state?.current_step ?? 'Add robot API routes';
  return NextResponse.json({
    ok: true,
    message: `You are working on ${step}. Next action: test /api/robot/state with your robot API key.`,
    status: state?.status ?? 'focused',
    next_action: 'Test the state endpoint.',
    proof_needed: 'Screenshot or copied JSON response from /api/robot/state.'
  });
}
