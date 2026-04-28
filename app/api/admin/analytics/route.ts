import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isBetaAdminEmail } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type EventRow = {
  user_id: string | null;
  event_type: string;
  route: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

function sinceIso(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

function eventCount(events: EventRow[], userId: string, names: string[]) {
  return events.filter((e) => e.user_id === userId && names.includes(e.event_type)).length;
}

function activationScore(args: {
  onboarding_complete: boolean;
  daily_plans_count: number;
  missions_started_count: number;
  missions_completed_count: number;
  proof_count: number;
  report_count: number;
  playbook_count: number;
  robot_connected: boolean;
  pro_interest: boolean;
  returned_second_day: boolean;
}) {
  let s = 10;
  if (args.onboarding_complete) s += 15;
  if (args.daily_plans_count > 0) s += 20;
  if (args.missions_started_count > 0) s += 20;
  if (args.proof_count > 0) s += 25;
  if (args.missions_completed_count > 0) s += 25;
  if (args.report_count > 0) s += 30;
  if (args.playbook_count > 0) s += 15;
  if (args.returned_second_day) s += 20;
  if (args.robot_connected) s += 30;
  if (args.pro_interest) s += 20;
  return Math.min(100, s);
}

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user || !isBetaAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: 'Not authorized.' }, { status: 403 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase admin unavailable.' }, { status: 500 });

  const dayAgo = sinceIso(24 * 60 * 60 * 1000);
  const weekAgo = sinceIso(7 * 24 * 60 * 60 * 1000);

  const [{ data: profiles }, { data: productEvents }, { data: proInterest }, { data: usageEvents }] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }),
    admin.from('product_events').select('user_id,event_type,route,metadata,created_at').order('created_at', { ascending: false }).limit(3000),
    admin.from('pro_interest').select('user_id,email,feature,created_at').order('created_at', { ascending: false }).limit(3000),
    admin.from('usage_events').select('user_id,event_type,created_at').order('created_at', { ascending: false }).limit(3000)
  ]);

  const profilesRows = profiles || [];
  const events = (productEvents || []) as EventRow[];
  const proRows = proInterest || [];
  const usageRows = usageEvents || [];

  const users = profilesRows.map((p: any) => {
    const uid = p.id;
    const userEvents = events.filter((e) => e.user_id === uid);
    const userUsage = usageRows.filter((e: any) => e.user_id === uid);
    const plans = eventCount(events, uid, ['daily_plan_started', 'daily_plan_accepted']);
    const started = eventCount(events, uid, ['mission_started']);
    const completed = eventCount(events, uid, ['mission_completed']);
    const proofs = eventCount(events, uid, ['proof_logged']);
    const reports = eventCount(events, uid, ['day_closed', 'report_generated']);
    const playbooks = eventCount(events, uid, ['playbook_created', 'playbook_run_today']);
    const robot = eventCount(events, uid, ['robot_connected', 'robot_event']) > 0;
    const pro = proRows.some((r: any) => r.user_id === uid || (r.email && r.email === p.email));
    const source = p.source || p.utm_source || p.ref || (userEvents.find((e) => e.metadata?.attribution?.utm_source)?.metadata?.attribution?.utm_source) || '';
    const returnedSecondDay = userEvents.some((e) => new Date(e.created_at).getTime() - new Date(p.created_at).getTime() > 24 * 60 * 60 * 1000);
    const score = activationScore({
      onboarding_complete: Boolean(p.onboarding_complete),
      daily_plans_count: plans,
      missions_started_count: started,
      missions_completed_count: completed,
      proof_count: proofs,
      report_count: reports,
      playbook_count: playbooks,
      robot_connected: robot,
      pro_interest: pro,
      returned_second_day: returnedSecondDay
    });
    const likelyToPay = score >= 60 || pro || robot || (reports >= 1 && proofs >= 1);
    const reason = pro
      ? 'Clicked Pro interest'
      : robot
        ? 'Connected DeskBot'
        : reports >= 1 && proofs >= 1
          ? 'Closed a day with proof'
          : playbooks >= 2
            ? 'Created multiple playbooks'
            : score >= 60
              ? 'High activation score'
              : '';
    const lastActiveAt = p.last_active_at || userEvents[0]?.created_at || userUsage[0]?.created_at || p.updated_at;
    return {
      id: uid,
      email: p.email,
      full_name: p.full_name,
      plan: p.plan,
      subscription_status: p.subscription_status,
      onboarding_complete: Boolean(p.onboarding_complete),
      created_at: p.created_at,
      last_active_at: lastActiveAt,
      source,
      x_handle: p.x_handle || '',
      daily_plans_count: plans,
      missions_started_count: started,
      missions_completed_count: completed,
      proof_count: proofs,
      report_count: reports,
      playbook_count: playbooks,
      robot_connected: robot,
      pro_interest: pro,
      activation_score: score,
      likely_to_pay: likelyToPay,
      likely_to_pay_reason: reason,
      admin_notes: p.admin_notes || '',
      contact_status: p.contact_status || 'new'
    };
  });

  const summary = {
    total_users: users.length,
    new_users_24h: users.filter((u) => u.created_at >= dayAgo).length,
    new_users_7d: users.filter((u) => u.created_at >= weekAgo).length,
    active_users_24h: users.filter((u) => u.last_active_at && u.last_active_at >= dayAgo).length,
    active_users_7d: users.filter((u) => u.last_active_at && u.last_active_at >= weekAgo).length,
    daily_plans_created: events.filter((e) => e.event_type === 'daily_plan_accepted').length,
    missions_started: events.filter((e) => e.event_type === 'mission_started').length,
    missions_completed: events.filter((e) => e.event_type === 'mission_completed').length,
    proofs_logged: events.filter((e) => e.event_type === 'proof_logged').length,
    reports_generated: events.filter((e) => e.event_type === 'day_closed' || e.event_type === 'report_generated').length,
    playbooks_created: events.filter((e) => e.event_type === 'playbook_created').length,
    pro_interest_count: proRows.length,
    conversion_ready_users: users.filter((u) => u.likely_to_pay).length
  };

  return NextResponse.json({
    ok: true,
    summary,
    users,
    recent_events: events.slice(0, 120)
  });
}

export async function PATCH(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user || !isBetaAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: 'Not authorized.' }, { status: 403 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase admin unavailable.' }, { status: 500 });
  const body = await req.json();
  if (!body?.user_id) return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 });
  const { error } = await admin
    .from('profiles')
    .update({
      admin_notes: body.admin_notes ?? undefined,
      contact_status: body.contact_status ?? undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.user_id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
