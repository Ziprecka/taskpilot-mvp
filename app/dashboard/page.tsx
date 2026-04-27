'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { WorkflowCard } from '@/components/WorkflowCard';
import { sampleWorkflows } from '@/data/sampleWorkflows';
import { addRecentActivity, getRecentActivity, type TaskPilotActivity } from '@/lib/activity';
import { getPinnedWorkflowIds, togglePinnedWorkflow } from '@/lib/pinnedWorkflows';
import { getFeedbackStorageKey, getGeneratedWorkflowsStorageKey } from '@/lib/storage';
import { TASKPILOT_VERSION } from '@/lib/version';

export default function DashboardPage() {
  const [env, setEnv] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [recentActivity, setRecentActivity] = useState<TaskPilotActivity[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [showTools, setShowTools] = useState(false);
  const [previewSession, setPreviewSession] = useState<any | null>(null);

  useEffect(() => {
    void fetch('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
    void fetch('/api/health').then((res) => res.json()).then((data) => setEnv(data?.env ?? null)).catch(() => null);
    void fetch('/api/db/status').then((res) => res.json()).then(setDbStatus).catch(() => null);
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
    setSavedSessions(sortedSessions.slice(0, 5));
    setRecentActivity(getRecentActivity());
    setPinnedIds(getPinnedWorkflowIds());
    try {
      const generated = JSON.parse(localStorage.getItem(getGeneratedWorkflowsStorageKey()) || '[]');
      setGeneratedCount(Array.isArray(generated) ? generated.length : 0);
    } catch {
      setGeneratedCount(0);
    }
    try {
      const feedback = JSON.parse(localStorage.getItem(getFeedbackStorageKey()) || '[]');
      setFeedbackCount(Array.isArray(feedback) ? feedback.filter((item: any) => item.status !== 'fixed').length : 0);
    } catch {
      setFeedbackCount(0);
    }
    setOnboardingComplete(localStorage.getItem('taskpilot-onboarding-complete') === 'true');
  }, []);

  const latestSession = savedSessions[0];
  const robotReadiness =
    (env?.hasRobotApiKey ? 30 : 0) +
    (dbStatus?.robot?.routes_exist ? 25 : 0) +
    (dbStatus?.robot?.test_page_exists ? 25 : 0) +
    (dbStatus?.robot?.heartbeat_successful ? 20 : 0);
  const missing = [
    !env?.hasRobotApiKey ? 'Robot key' : null,
    !dbStatus?.robot?.routes_exist ? 'API routes' : null,
    !dbStatus?.robot?.test_page_exists ? 'Test page' : null,
    !dbStatus?.robot?.heartbeat_successful ? 'Heartbeat' : null
  ].filter(Boolean);

  const pinnedWorkflows = useMemo(() => sampleWorkflows.filter((w) => pinnedIds.includes(w.id)), [pinnedIds]);
  const recommended = !onboardingComplete
    ? { title: 'Finish onboarding', reason: 'Personalize recommendations and coaching style.', href: '/onboarding', cta: 'Continue onboarding' }
    : latestSession
      ? { title: 'Continue your active session', reason: `Pick up where you left off on ${latestSession.workflow_id || 'your workflow'}.`, href: `/session/${latestSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(latestSession.id)}`, cta: 'Continue session' }
      : { title: 'Plan your day in Daily Mode', reason: 'Define top outcomes before diving into tasks.', href: '/daily', cta: 'Open Daily Mode' };

  const tools = [
    { href: '/settings/setup', title: 'Setup checklist', desc: 'Validate environment and schema' },
    { href: '/settings/deploy', title: 'Deployment readiness', desc: 'Check production configuration' },
    { href: '/settings/robot', title: 'Robot API', desc: 'Test robot endpoints and heartbeat' },
    { href: '/sessions', title: 'Saved sessions', desc: 'Resume previous workflow runs' },
    { href: '/workflows/saved', title: 'Workflow library', desc: 'Browse and pin workflows' },
    { href: '/demo', title: 'Demo mode', desc: 'Guided beta demo surface' },
    { href: '/settings/mobile', title: 'Mobile/PWA', desc: 'Install and test phone experience' },
    { href: '/feedback', title: 'Feedback', desc: 'Track product issues and suggestions' },
    { href: '/settings/auth-debug', title: 'Auth debug', desc: 'Inspect client/server auth state' }
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="card card-hero mb-7 p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="badge mb-3">Execution cockpit</p>
              <h1 className="text-3xl font-black md:text-4xl">TaskPilot Dashboard</h1>
              <p className="mt-2 text-slate-400">Know what to do next, run focused execution, and track progress in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/workflows/new" className="btn-primary">Start workflow</Link>
              <Link href={latestSession ? `/session/${latestSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(latestSession.id)}` : '/session/taskpilot-mvp-build'} className="btn-secondary">Continue latest</Link>
              <Link href="/workflows/generate" className="btn-secondary">Generate workflow</Link>
              <button className="btn-ghost" onClick={() => setShowTools(true)}>Tools</button>
            </div>
          </div>
        </div>

        <div className="mb-6 card p-5">
          <p className="text-sm text-slate-400">Recommended next action</p>
          <h2 className="mt-1 text-2xl font-black">{recommended.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{recommended.reason}</p>
          <Link href={recommended.href} className="btn-primary btn-sm mt-3 inline-flex">{recommended.cta}</Link>
        </div>

        {!onboardingComplete && (
          <div className="mb-5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">
            New here? Finish onboarding to personalize dashboard suggestions. <Link href="/onboarding" className="underline">Open onboarding</Link>
          </div>
        )}

        <div className="mb-7 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="card card-list p-5">
            <p className="text-sm text-slate-400">Recent sessions</p>
            {savedSessions.length ? (
              <div className="mt-3 space-y-2">
                {savedSessions.map((session) => (
                  <button key={session.id} className="w-full rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-left text-sm transition hover:border-amber-400/40" onClick={() => setPreviewSession(session)}>
                    {session.workflow_id || 'workflow'} · step {session.current_step || 1}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">No sessions yet</p>
                <p className="mt-1 text-sm text-slate-400">Start your first run and it will appear here.</p>
                <Link href="/workflows/new" className="btn-primary btn-sm mt-3 inline-flex">Start workflow</Link>
              </div>
            )}
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Daily command center</p>
            <p className="mt-1 text-xl font-bold">Plan today&apos;s top 3 outcomes</p>
            <p className="mt-1 text-xs text-slate-500">Convert outcomes into focus blocks and execution proof.</p>
            <Link href="/daily" className="btn-secondary btn-sm mt-3 inline-flex">Open Daily Mode</Link>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">System status</p>
            <p className="mt-1 text-sm text-slate-300">AI: {env?.hasOpenAIKey ? 'OpenAI' : 'Mock'}</p>
            <p className="text-sm text-slate-300">Supabase: {env?.supabaseEnabled ? 'Synced' : 'Local only'}</p>
            <p className="text-sm text-slate-300">Robot readiness: {robotReadiness}/100</p>
            <p className="mt-1 text-xs text-slate-500">Missing: {missing.length ? missing.join(', ') : 'No blockers'}</p>
          </div>
        </div>

        <div className="mb-7 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="card p-5">
            <p className="text-sm text-slate-400">Pinned workflows</p>
            {pinnedWorkflows.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {pinnedWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} pinned onTogglePin={(id) => setPinnedIds(togglePinnedWorkflow(id))} />
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">Pin workflows you use often.</p>
                <p className="mt-1 text-sm text-slate-400">Use Pin from the Workflow Library to build your default toolkit.</p>
                <Link href="/workflows/saved" className="btn-secondary btn-sm mt-3 inline-flex">Open Workflow Library</Link>
              </div>
            )}
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Recent Activity</p>
            <div className="mt-3 space-y-2">
              {recentActivity.length ? recentActivity.slice(0, 10).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm">
                  <p className="font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()} · {event.type}</p>
                  {event.route && <Link href={event.route} className="mt-1 inline-block text-xs text-amber-300">Open</Link>}
                </div>
              )) : (
                <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">No activity yet</p>
                  <p className="mt-1 text-sm text-slate-400">Actions like workflow generation, focus starts, and reports will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-black">Starter workflows</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              pinned={pinnedIds.includes(workflow.id)}
              onTogglePin={(id) => {
                setPinnedIds(togglePinnedWorkflow(id));
                addRecentActivity({ type: 'workflow_pinned', title: `${pinnedIds.includes(id) ? 'Unpinned' : 'Pinned'} workflow`, route: '/workflows/saved' });
              }}
            />
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">TaskPilot version {TASKPILOT_VERSION}</p>
      </section>

      {showTools && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowTools(false)}>
          <div className="card w-full max-w-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-black">TaskPilot Tools</h2>
              <button className="btn-ghost" onClick={() => setShowTools(false)}>Close</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {tools.map((tool) => (
                <Link key={tool.href} href={tool.href} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 transition hover:border-amber-400/40" onClick={() => setShowTools(false)}>
                  <p className="font-semibold text-white">{tool.title}</p>
                  <p className="text-sm text-slate-400">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/55" onClick={() => setPreviewSession(null)}>
          <div className="h-full w-full max-w-md border-l border-slate-700 bg-slate-950 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black">Session Preview</h2>
            <p className="mt-3 text-sm text-slate-400">Workflow</p>
            <p className="font-semibold">{previewSession.workflow_id || 'workflow'}</p>
            <p className="mt-2 text-sm text-slate-400">Status</p>
            <p>{previewSession.status || 'active'}</p>
            <p className="mt-2 text-sm text-slate-400">Current step</p>
            <p>{previewSession.current_step || 1}</p>
            <p className="mt-2 text-sm text-slate-400">Percent complete</p>
            <p>{Math.round(((previewSession.completed_steps?.length || 0) / Math.max(1, 5)) * 100)}%</p>
            <p className="mt-2 text-sm text-slate-400">Last updated</p>
            <p>{previewSession.updated_at ? new Date(previewSession.updated_at).toLocaleString() : 'unknown'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/session/${previewSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(previewSession.id)}`} className="btn-primary">Continue</Link>
              <Link href={`/session/${previewSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(previewSession.id)}`} className="btn-secondary">Generate report</Link>
              <button className="btn-danger" onClick={() => {
                localStorage.removeItem(`taskpilot-session-${previewSession.id}`);
                setSavedSessions((prev) => prev.filter((s) => s.id !== previewSession.id));
                setPreviewSession(null);
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
