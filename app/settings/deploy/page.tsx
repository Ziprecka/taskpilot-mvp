'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

const ENV_TEMPLATE = `OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_ENABLED=true
TASKPILOT_ROBOT_API_KEY=`;

const TEST_URLS = `https://YOUR-VERCEL-URL.vercel.app/api/ping
https://YOUR-VERCEL-URL.vercel.app/deploy-test
https://YOUR-VERCEL-URL.vercel.app/dashboard
https://YOUR-VERCEL-URL.vercel.app/api/health
https://YOUR-VERCEL-URL.vercel.app/settings/setup
https://YOUR-VERCEL-URL.vercel.app/settings/robot
https://YOUR-VERCEL-URL.vercel.app/settings/deploy
https://YOUR-VERCEL-URL.vercel.app/settings/mobile`;

const GIT_COMMANDS = `git init
git add .
git commit -m "Initial TaskPilot MVP"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main`;

export default function DeployPage() {
  const [health, setHealth] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);

  useEffect(() => {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
    void fetch('/api/db/status').then((res) => res.json()).then(setDbStatus).catch(() => null);
  }, []);

  function copyText(value: string) {
    void navigator.clipboard.writeText(value);
  }

  const readiness = [
    { label: 'App runs locally', ok: true },
    { label: 'OpenAI configured', ok: Boolean(health?.env?.openai?.detected) },
    { label: 'Supabase configured', ok: Boolean(health?.env?.supabase?.urlDetected && health?.env?.supabase?.anonKeyDetected && health?.env?.supabase?.serviceRoleDetected) },
    { label: 'Schema installed', ok: Boolean(dbStatus?.schema?.installed) },
    { label: 'Seed installed', ok: Boolean(dbStatus?.seed?.installed) },
    { label: 'Robot API key configured', ok: Boolean(health?.env?.robot?.apiKeyDetected) }
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Deploy TaskPilot to Vercel</h1>
        <p className="mb-5 text-slate-400">Production readiness checklist, environment setup, and launch flow.</p>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">1. Local readiness</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {readiness.map((item) => (
              <p key={item.label} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">
                {item.label}: <span className={item.ok ? 'text-emerald-300' : 'text-amber-300'}>{item.ok ? 'ready' : 'missing'}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">2. Vercel environment variables</h2>
          <pre className="rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">{ENV_TEMPLATE}</pre>
          <button className="btn-secondary mt-3 text-sm" onClick={() => copyText(ENV_TEMPLATE)}>Copy Vercel env checklist</button>
        </div>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">3. Exact deployment steps</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
            <li>Push project to GitHub.</li>
            <li>Go to Vercel and import the GitHub repository.</li>
            <li>Set Framework Preset to Next.js.</li>
            <li>Add environment variables in Vercel Project Settings.</li>
            <li>Deploy.</li>
            <li>Open deployment URL.</li>
            <li>Visit https://YOUR-VERCEL-URL.vercel.app/api/health</li>
            <li>Visit https://YOUR-VERCEL-URL.vercel.app/settings/setup</li>
            <li>Visit https://YOUR-VERCEL-URL.vercel.app/settings/robot</li>
            <li>Open on phone and Add to Home Screen.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary text-sm" onClick={() => copyText(TEST_URLS)}>Copy deployment test URLs</button>
            <button className="btn-secondary text-sm" onClick={() => copyText(GIT_COMMANDS)}>Copy Git commands</button>
            <Link href="/dashboard" className="btn-secondary text-sm">Back to dashboard</Link>
          </div>
        </div>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Build check command</h2>
          <pre className="rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">npm run build</pre>
          <p className="mt-2 text-sm text-slate-300">Expected: build completes with no TypeScript errors. If build fails, paste the error into TaskPilot and fix before deploying.</p>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">4. Deployment test checklist</h2>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-slate-300">
            <p>Landing page loads</p>
            <p>Dashboard loads</p>
            <p>OpenAI badge says OpenAI</p>
            <p>Supabase sync works</p>
            <p>Workflow generator works</p>
            <p>Daily Mode loads</p>
            <p>Robot API health works</p>
            <p>Mobile layout usable</p>
            <p>Add to Home Screen works</p>
          </div>
          <Link href="/settings/mobile" className="btn-secondary mt-3 inline-flex text-sm">Open mobile setup</Link>
        </div>
        <div className="card mt-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">404 Troubleshooting</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
            <li>Test <code>/api/ping</code>.</li>
            <li>Test <code>/deploy-test</code>.</li>
            <li>Test <code>/dashboard</code>.</li>
            <li>Check Vercel Root Directory setting.</li>
            <li>Check GitHub repo top-level contains <code>package.json</code>.</li>
            <li>Check Vercel Framework Preset is Next.js.</li>
            <li>Check Build Command is <code>npm run build</code>.</li>
            <li>Leave Output Directory blank.</li>
            <li>Redeploy after settings changes.</li>
          </ol>
          <Link href="/deploy-test" className="btn-secondary mt-3 inline-flex text-sm">Open deploy-test page</Link>
        </div>
      </section>
    </main>
  );
}
