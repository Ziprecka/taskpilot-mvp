'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getRecentActivity, type TaskPilotActivity } from '@/lib/activity';
import { getDailyStorageKey, getUserProgressionStorageKey } from '@/lib/storage';
import { TASKPILOT_VERSION } from '@/lib/version';

export default function DashboardPage() {
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<TaskPilotActivity[]>([]);
  const [dailyState, setDailyState] = useState<any>(null);
  const [progression, setProgression] = useState<any>(null);
  const [deskBotStatus, setDeskBotStatus] = useState<{ online?: boolean; mission?: string; next_move?: string } | null>(null);

  useEffect(() => {
    const values: any[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('taskpilot-session-')) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (parsed?.session) values.push(parsed.session);
      } catch {
        // ignore
      }
    }
    const sortedSessions = values.sort((a, b) => String(b?.updated_at || '').localeCompare(String(a?.updated_at || '')));
    const deduped = sortedSessions.reduce((acc: any[], session: any) => {
      if (acc.some((item) => item.workflow_id === session.workflow_id)) return acc;
      return [...acc, session];
    }, []);
    setSavedSessions(deduped.slice(0, 5));
    setRecentActivity(getRecentActivity());
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dailyRaw = localStorage.getItem(getDailyStorageKey(today));
      setDailyState(dailyRaw ? JSON.parse(dailyRaw) : null);
    } catch {
      setDailyState(null);
    }
    try {
      const progRaw = localStorage.getItem(getUserProgressionStorageKey());
      setProgression(progRaw ? JSON.parse(progRaw) : null);
    } catch {
      setProgression(null);
    }
    const key = localStorage.getItem('taskpilot-robot-api-key');
    if (key) {
      void fetch('/api/robot/state', { headers: { 'x-taskpilot-robot-key': key } })
        .then((r) => r.json())
        .then((payload) => setDeskBotStatus({ online: payload?.meta?.online, mission: payload?.state?.mission, next_move: payload?.state?.next_move }))
        .catch(() => null);
    }
  }, []);

  const latestSession = savedSessions[0];
  const totalXP = Number(progression?.total_xp || 0);
  const recommended = dailyState?.active_focus_block?.status === 'active'
    ? { title: 'Run active mission', reason: `Focus on ${dailyState.active_focus_block.title} and log proof.`, href: '/daily', cta: 'Open mission' }
    : !dailyState?.outcomes?.length
      ? { title: 'Plan today', reason: 'No outcomes yet. Define today before execution.', href: '/daily', cta: 'Plan today' }
      : dailyState?.outcomes?.some((o: any) => o.status !== 'done')
        ? { title: 'Start next outcome', reason: 'Unfinished outcomes are waiting for a focused block.', href: '/daily', cta: 'Open Today' }
        : dailyState?.status === 'complete'
          ? { title: 'Review debrief or plan tomorrow', reason: 'Day is closed. Preserve momentum for tomorrow.', href: '/daily', cta: 'View debrief' }
          : latestSession
            ? { title: 'Continue playbook', reason: `Pick up where you left off on ${latestSession.workflow_id || 'your playbook'}.`, href: `/session/${latestSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(latestSession.id)}`, cta: 'Continue playbook' }
            : { title: 'Create first plan', reason: 'Start a focused day and capture proof quickly.', href: '/daily', cta: 'Plan today' };

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 card card-hero p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500">Recommended Next Move</p>
          <h1 className="mt-2 text-3xl font-black">{recommended.title}</h1>
          <p className="mt-2 text-slate-300">{recommended.reason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={recommended.href} className="btn-primary">{recommended.cta}</Link>
            <Link href="/workflows/generate" className="btn-secondary">Create Playbook</Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm text-slate-400">Today snapshot</p>
            <p className="mt-1 text-xl font-bold">Status: {dailyState?.status || 'planning'}</p>
            <p className="mt-1 text-xs text-slate-500">Outcomes: {dailyState?.outcomes?.filter((o: any) => o.status === 'done')?.length || 0}/{dailyState?.outcomes?.length || 0} · Proof: {dailyState?.proof_items?.length || 0} · XP +{dailyState?.xp_today || 0}</p>
            <Link href="/daily" className="btn-secondary btn-sm mt-3 inline-flex">Open Today</Link>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Active Playbook</p>
            <p className="mt-1 text-lg font-semibold text-white">{latestSession?.workflow_id || 'No active playbook'}</p>
            <p className="mt-1 text-xs text-slate-500">{latestSession ? `Step ${latestSession.current_step || 1} in progress` : 'Start from Playbook Library when needed.'}</p>
            <Link href={latestSession ? `/session/${latestSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(latestSession.id)}` : '/workflows/saved'} className="btn-secondary btn-sm mt-3 inline-flex">
              {latestSession ? 'Continue' : 'Open Playbooks'}
            </Link>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">DeskBot status</p>
            <p className="mt-1 text-lg font-semibold text-white">{deskBotStatus?.online ? 'Online' : 'Offline'}</p>
            <p className="mt-1 text-xs text-slate-500">Mission: {deskBotStatus?.mission || 'No mission synced'}</p>
            <p className="text-xs text-slate-500">Next: {deskBotStatus?.next_move || 'Open Today and check in'}</p>
            <Link href="/settings/robot" className="btn-ghost btn-sm mt-3 inline-flex">Open Robot Settings</Link>
          </div>
        </div>

        {!!recentActivity.length && (
          <div className="card p-5">
            <p className="text-sm text-slate-400">Recent Activity</p>
            <div className="mt-3 space-y-2">
              {recentActivity.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()} · {event.type}</p>
                  {event.route && <Link href={event.route} className="mt-1 inline-block text-xs text-amber-300">Open</Link>}
                </div>
              ))}
            </div>            
          </div>
        )}
        <p className="mt-6 text-xs text-slate-500">TaskPilot beta · build {TASKPILOT_VERSION}</p>
      </section>
    </main>
  );
}
