'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { WorkflowCard } from '@/components/WorkflowCard';
import { sampleWorkflows } from '@/data/sampleWorkflows';
import { TASKPILOT_VERSION } from '@/lib/version';
import { getFeedbackStorageKey, getGeneratedWorkflowsStorageKey } from '@/lib/storage';

export default function DashboardPage() {
  const [env, setEnv] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
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
    setSavedSessions(values.slice(0, 3));
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

  const robotReadiness =
    (env?.hasRobotApiKey ? 30 : 0) +
    (dbStatus?.robot?.routes_exist ? 25 : 0) +
    (dbStatus?.robot?.test_page_exists ? 25 : 0) +
    (dbStatus?.robot?.heartbeat_successful ? 20 : 0);
  const missing = [
    !env?.hasRobotApiKey ? 'Robot API key configured' : null,
    !dbStatus?.robot?.routes_exist ? 'Robot API routes exist' : null,
    !dbStatus?.robot?.test_page_exists ? 'Robot test page exists' : null,
    !dbStatus?.robot?.heartbeat_successful ? 'Robot heartbeat successful' : null
  ].filter(Boolean);
  const latestSession = savedSessions[0];
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="card card-hero mb-7 p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="badge mb-3">Founder cockpit</p>
              <h1 className="text-3xl font-black md:text-4xl">TaskPilot Dashboard</h1>
              <p className="mt-2 text-slate-400">Run today’s execution loop: continue your session, unblock bottlenecks, and ship.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/workflows/new" className="btn-primary">Start new workflow</Link>
              <Link href={latestSession ? `/session/${latestSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(latestSession.id)}` : '/session/taskpilot-mvp-build'} className="btn-secondary">Continue latest</Link>
              <Link href="/workflows/generate" className="btn-secondary">Generate workflow</Link>
              <details className="relative">
                <summary className="btn-ghost cursor-pointer list-none">Tools</summary>
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl">
                  <Link href="/settings/setup" className="btn-ghost w-full justify-start text-left">Setup checklist</Link>
                  <Link href="/settings/deploy" className="btn-ghost w-full justify-start text-left">Deployment readiness</Link>
                  <Link href="/settings/robot" className="btn-ghost w-full justify-start text-left">Robot API</Link>
                  <Link href="/sessions" className="btn-ghost w-full justify-start text-left">Saved sessions</Link>
                  <Link href="/workflows/saved" className="btn-ghost w-full justify-start text-left">Workflow library</Link>
                  <Link href="/demo" className="btn-ghost w-full justify-start text-left">Demo mode</Link>
                </div>
              </details>
            </div>
          </div>
        </div>
        {!onboardingComplete && (
          <div className="mb-5 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">
            New here? Finish onboarding. <Link href="/onboarding" className="underline">Open onboarding</Link>
          </div>
        )}

        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Today / Now</h2>
        <div className="mb-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card card-stat card-hover p-5">
            <p className="text-sm text-slate-400">Active sessions</p>
            <p className="text-3xl font-black">{Math.max(1, savedSessions.length)}</p>
            <p className="text-xs text-slate-500">Continue your latest workflow from current step.</p>
          </div>
          <div className="card card-hover p-5">
            <p className="text-sm text-slate-400">Continue latest session</p>
            <p className="text-base font-bold">{latestSession?.workflow_id || 'taskpilot-mvp-build'}</p>
            <p className="text-xs text-slate-500">Step {latestSession?.current_step || 1}</p>
            <Link href={latestSession ? `/session/${latestSession.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(latestSession.id)}` : '/session/taskpilot-mvp-build'} className="btn-secondary btn-sm mt-3 inline-flex">Resume</Link>
          </div>
          <div className="card card-hover p-5">
            <p className="text-sm text-slate-400">Daily productivity</p>
            <p className="text-base font-bold">Command center ready</p>
            <p className="text-xs text-slate-500">Capture outcomes and focus blocks.</p>
            <Link href="/daily" className="btn-secondary btn-sm mt-3 inline-flex">Open Daily Mode</Link>
          </div>
          <div className="card card-hover p-5">
            <p className="text-sm text-slate-400">AI mode</p>
            <p className="text-base font-bold">{env?.hasOpenAIKey ? 'OpenAI ready' : 'Mock mode'}</p>
            <p className="text-xs text-slate-500">Source: {env?.hasOpenAIKey ? 'production model' : 'fallback assistant'}</p>
          </div>
        </div>

        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">System / Readiness</h2>
        <div className="mb-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card card-stat p-5"><p className="text-sm text-slate-400">Supabase mode</p><p className="text-lg font-bold">{env?.supabaseEnabled ? 'Synced' : 'Local only'}</p></div>
          <div className="card card-stat p-5"><p className="text-sm text-slate-400">Robot API</p><p className="text-lg font-bold">{env?.hasRobotApiKey ? 'Configured' : 'Missing key'}</p></div>
          <div className="card card-stat p-5"><p className="text-sm text-slate-400">Deployment</p><p className="text-lg font-bold">{env?.productionReady ? 'Ready' : 'Needs setup'}</p></div>
          <div className="card card-stat p-5"><p className="text-sm text-slate-400">Mobile / PWA</p><p className="text-lg font-bold">Installable</p></div>
        </div>

        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Library / History</h2>
        <div className="mb-7 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="card card-list p-5">
            <p className="text-sm text-slate-400">Saved sessions</p>
            {savedSessions.length ? (
              <div className="mt-3 space-y-2">
                {savedSessions.map((session) => (
                  <Link key={session.id} className="block rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm transition hover:border-amber-400/40" href={`/session/${session.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(session.id)}`}>
                    {session.workflow_id || 'workflow'} · step {session.current_step || 1}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">No saved sessions yet</p>
                <p className="mt-1 text-sm text-slate-400">Start your first guided run and it will appear here.</p>
                <Link href="/workflows/new" className="btn-primary btn-sm mt-3 inline-flex">Start workflow</Link>
              </div>
            )}
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Workflow library</p>
            <p className="text-3xl font-black">{generatedCount + sampleWorkflows.length}</p>
            <p className="text-xs text-slate-500">Last source: generated + starter workflows</p>
            <Link href="/workflows/saved" className="btn-secondary btn-sm mt-3 inline-flex">Open Library</Link>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Beta feedback</p>
            <p className="text-3xl font-black">{feedbackCount}</p>
            <p className="text-xs text-slate-500">Open items waiting for triage</p>
            <Link href="/feedback" className="btn-secondary btn-sm mt-3 inline-flex">Review feedback</Link>
          </div>
        </div>

        <div className="mb-7 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="card p-5">
            <p className="text-sm text-slate-400">Robot readiness score</p>
            <p className="text-3xl font-black">{robotReadiness}/100</p>
            <p className="text-xs text-slate-500">Missing: {missing.length ? missing.join(', ') : 'No blockers'}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Version</p>
            <p className="text-lg font-bold">TaskPilot {TASKPILOT_VERSION}</p>
            <p className="text-xs text-slate-500">Dark/navy/gold beta environment</p>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-black">Starter workflows</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {sampleWorkflows.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} />)}
        </div>
      </section>
    </main>
  );
}
