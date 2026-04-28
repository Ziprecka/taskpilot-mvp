import { getDbGuard } from '@/lib/db';

export async function resolveDefaultRobotOwnerUserId() {
  const guard = getDbGuard();
  const byId = process.env.TASKPILOT_DEFAULT_ROBOT_USER_ID || null;
  if (byId) return byId;
  const fallbackEmail = (process.env.TASKPILOT_DEFAULT_ROBOT_USER_EMAIL || '').trim().toLowerCase();
  if (!guard.ok || !fallbackEmail) return null;
  const prof = await guard.supabase.from('profiles').select('id,email').eq('email', fallbackEmail).maybeSingle();
  return (prof.data?.id as string | undefined) || null;
}

export async function resolveRobotOwner(robotId: string): Promise<{ userId: string | null; email: string | null; mapped: boolean }> {
  const guard = getDbGuard();
  if (!guard.ok) {
    const fallback = await resolveDefaultRobotOwnerUserId();
    return { userId: fallback, email: null, mapped: Boolean(fallback) };
  }
  const device = await guard.supabase.from('robot_devices').select('user_id').eq('robot_id', robotId).maybeSingle();
  const mappedUserId = (device.data?.user_id as string | undefined) || null;
  if (mappedUserId) {
    const prof = await guard.supabase.from('profiles').select('email').eq('id', mappedUserId).maybeSingle();
    return { userId: mappedUserId, email: (prof.data?.email as string | undefined) || null, mapped: true };
  }
  const fallbackId = await resolveDefaultRobotOwnerUserId();
  if (!fallbackId) return { userId: null, email: null, mapped: false };
  const prof = await guard.supabase.from('profiles').select('email').eq('id', fallbackId).maybeSingle();
  await guard.supabase.from('robot_devices').upsert(
    {
      user_id: fallbackId,
      robot_id: robotId,
      name: robotId,
      device_type: 'custom',
      capabilities: {},
      updated_at: new Date().toISOString()
    },
    { onConflict: 'robot_id' }
  );
  return { userId: fallbackId, email: (prof.data?.email as string | undefined) || null, mapped: true };
}
