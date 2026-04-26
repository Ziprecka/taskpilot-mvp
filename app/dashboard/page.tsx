'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { WorkflowCard } from '@/components/WorkflowCard';
import { sampleWorkflows } from '@/data/sampleWorkflows';

export default function DashboardPage() {
  const [env, setEnv] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  useEffect(() => {
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
      const generated = JSON.parse(localStorage.getItem('taskpilot-generated-workflows') || '[]');
      setGeneratedCount(Array.isArray(generated) ? generated.length : 0);
    } catch {
      setGeneratedCount(0);
    }
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
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="badge mb-3">Founder cockpit</p>
            <h1 className="text-4xl font-black">TaskPilot Dashboard</h1>
            <p className="mt-2 text-slate-400">Start a workflow, debug a task, or turn a process into a reusable system.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings/setup" className="btn-secondary">Setup checklist</Link>
            <Link href="/settings/deploy" className="btn-secondary">Deployment readiness</Link>
            <Link href="/settings/robot" className="btn-secondary">Robot API</Link>
            <Link href="/sessions" className="btn-secondary">Saved sessions</Link>
            <Link href="/workflows/generate" className="btn-secondary">Generate Workflow</Link>
            <Link href="/workflows/new" className="btn-primary">Start new workflow</Link>
          </div>
        </div>
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="card p-5"><p className="text-sm text-slate-400">Active sessions</p><p className="text-3xl font-black">1</p></div>
          <div className="card p-5"><p className="text-sm text-slate-400">Recent saved workflows</p><p className="text-3xl font-black">{generatedCount + sampleWorkflows.length}</p></div>
          <div className="card p-5"><p className="text-sm text-slate-400">Deployment Readiness</p><p className="text-lg font-bold">{env?.productionReady ? 'Production-ready env' : 'Needs env setup'}</p><Link href="/settings/deploy" className="btn-secondary mt-2 inline-flex">Open Deploy Settings</Link></div>
          <div className="card p-5"><p className="text-sm text-slate-400">AI mode</p><p className="text-lg font-bold">{env?.hasOpenAIKey ? 'Ready' : 'Missing key'}</p></div>
          <div className="card p-5"><p className="text-sm text-slate-400">Supabase mode</p><p className="text-lg font-bold">{env?.supabaseEnabled ? 'Ready' : 'Local mode'}</p></div>
          <div className="card p-5"><p className="text-sm text-slate-400">Robot API Status</p><p className="text-lg font-bold">{env?.hasRobotApiKey ? 'Key configured' : 'Key missing'}</p></div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Daily Productivity</p>
            <p className="text-lg font-bold">Command center active</p>
            <Link href="/daily" className="btn-secondary mt-2 inline-flex">Open Daily Mode</Link>
          </div>
          <div className="card p-5">
            <p className="mb-2 text-sm text-slate-400">Continue latest session</p>
            <Link href="/session/taskpilot-mvp-build" className="btn-secondary mr-2 inline-flex">Continue latest session</Link>
            <Link href="/session/taskpilot-mvp-build" className="btn-primary inline-flex">Start TaskPilot MVP Build Workflow</Link>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Generate New Workflow</p>
            <p className="text-lg font-bold">Custom AI-generated plans</p>
            <Link href="/workflows/generate" className="btn-secondary mt-2 inline-flex">Open Generator</Link>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-400">Mobile App / PWA</p>
            <p className="text-lg font-bold">Installable on phone</p>
            <Link href="/settings/mobile" className="btn-secondary mt-2 inline-flex">Mobile setup</Link>
          </div>
          <div className="card p-5 md:col-span-2">
            <p className="text-sm text-slate-400">Robot Readiness Score</p>
            <p className="text-3xl font-black">{robotReadiness}/100</p>
            <p className="text-xs text-slate-500">Missing: {missing.join(', ')}</p>
          </div>
          <div className="card p-5 md:col-span-3">
            <p className="mb-2 text-sm text-slate-400">Saved sessions (latest 3)</p>
            {savedSessions.length ? (
              <div className="flex flex-wrap gap-2">
                {savedSessions.map((session) => (
                  <Link key={session.id} className="btn-secondary text-xs" href={`/session/${session.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(session.id)}`}>
                    {session.workflow_id || 'workflow'} · step {session.current_step || 1}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No saved sessions yet.</p>
            )}
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
