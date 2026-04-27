import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function trackUsageEvent(userId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  await admin.from('usage_events').insert({
    user_id: userId,
    event_type: eventType,
    metadata
  });
}
