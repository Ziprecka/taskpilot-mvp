import { NextRequest, NextResponse } from 'next/server';
import { getDbUserGuard } from '@/lib/db';
import { syncDeskBotStateFromToday } from '@/lib/deskBotSync';
import type { DailyCommandState } from '@/types/workflow';

export async function POST(req: NextRequest) {
  const guard = await getDbUserGuard();
  if (!guard.ok) return NextResponse.json(guard.body, { status: guard.status });

  const body = await req.json();
  const robotId = String(body?.robot_id || 'atom-s3r-001');
  const daily = body?.daily_state as DailyCommandState | undefined;
  if (!daily) return NextResponse.json({ ok: false, error: 'Missing daily_state.' }, { status: 400 });

  const synced = await syncDeskBotStateFromToday(guard.userId, daily, robotId);
  if (!synced.ok) return NextResponse.json({ ok: false, error: synced.error }, { status: 500 });

  await guard.supabase.from('robot_devices').upsert(
    {
      user_id: guard.userId,
      robot_id: robotId,
      name: robotId,
      device_type: 'custom',
      capabilities: {},
      updated_at: new Date().toISOString()
    },
    { onConflict: 'robot_id' }
  );

  return NextResponse.json({
    ok: true,
    sync_status: 'synced',
    state: {
      ...synced.state,
      current_task: 'Today',
      current_step: synced.state.mission,
      next_action: synced.state.next_move
    },
    updated_at: new Date().toISOString()
  });
}
