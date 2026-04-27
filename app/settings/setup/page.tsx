'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { TASKPILOT_VERSION } from '@/lib/version';

interface HealthPayload {
  ok: boolean;
  env: {
    hasOpenAIKey: boolean;
    openAIKeyPrefix: string | null;
    hasSupabaseUrl: boolean;
    hasSupabaseAnonKey: boolean;
    hasSupabaseServiceRole: boolean;
    supabaseEnabled: boolean;
  };
}

interface DbStatusPayload {
  ok: boolean;
  db_enabled: boolean;
  schema: { installed: boolean };
  seed: { installed: boolean };
  next_fix: string;
}

export default function SetupPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatusPayload | null>(null);
  const [schemaSql, setSchemaSql] = useState('');
  const [seedSql, setSeedSql] = useState('');

  async function recheck() {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
    void fetch('/api/db/status').then((res) => res.json()).then(setDbStatus).catch(() => null);
    void fetch('/api/setup/schema').then((res) => res.json()).then((d) => setSchemaSql(d?.sql ?? '')).catch(() => null);
    void fetch('/api/setup/seed').then((res) => res.json()).then((d) => setSeedSql(d?.sql ?? '')).catch(() => null);
  }

  useEffect(() => {
    void recheck();
  }, []);

  function copyText(value: string) {
    void navigator.clipboard.writeText(value);
  }

  const checklist = [
    { label: 'OpenAI key detected', ok: Boolean(health?.env.hasOpenAIKey), fix: 'Add OPENAI_API_KEY to .env.local and restart dev server.' },
    { label: 'Supabase URL detected', ok: Boolean(health?.env.hasSupabaseUrl), fix: 'Add NEXT_PUBLIC_SUPABASE_URL to .env.local.' },
    { label: 'Supabase anon key detected', ok: Boolean(health?.env.hasSupabaseAnonKey), fix: 'Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.' },
    { label: 'Supabase service role detected', ok: Boolean(health?.env.hasSupabaseServiceRole), fix: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server only).' },
    { label: 'Supabase DB enabled', ok: Boolean(health?.env.supabaseEnabled), fix: 'Set SUPABASE_DB_ENABLED=true in .env.local.' },
    { label: 'Schema installed', ok: Boolean(dbStatus?.schema?.installed), fix: 'Run supabase/schema.sql in Supabase SQL Editor.' },
    { label: 'Seed installed', ok: Boolean(dbStatus?.seed?.installed), fix: 'Run supabase/seed.sql after schema.' }
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-2 text-3xl font-black">Setup Checklist</h1>
        <p className="mb-5 text-slate-400">Use this page to confirm OpenAI and Supabase configuration.</p>
        <div className="card mb-5 p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">OpenAI Status</h2>
          <p className="text-sm text-slate-300">OpenAI key detected: {health?.env.hasOpenAIKey ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">OpenAI key masked: {health?.env.openAIKeyPrefix ?? 'n/a'}</p>
          <p className="text-sm text-slate-300">Current AI mode: {health?.env.hasOpenAIKey ? 'OpenAI (if request succeeds)' : 'Mock Mode'}</p>
        </div>
        <div className="card mb-5 p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Supabase Status</h2>
          <p className="text-sm text-slate-300">Supabase URL detected: {health?.env.hasSupabaseUrl ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">Supabase anon key detected: {health?.env.hasSupabaseAnonKey ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">Supabase service role detected: {health?.env.hasSupabaseServiceRole ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">Supabase DB enabled: {health?.env.supabaseEnabled ? 'yes' : 'no'}</p>
          <p className="mt-2 text-sm text-amber-300">Next fix: {dbStatus?.next_fix ?? 'checking...'}</p>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Checklist</h2>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                <p className="font-semibold text-white">{item.label}: {item.ok ? 'OK' : 'Missing'}</p>
                {!item.ok && <p className="text-sm text-amber-300">{item.fix}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="card mt-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Exact Setup Steps</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-300">
            <li>Create Supabase project.</li>
            <li>Go to Settings &gt; API.</li>
            <li>Copy Project URL.</li>
            <li>Copy anon/public key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</li>
            <li>Copy service_role key for `SUPABASE_SERVICE_ROLE_KEY`.</li>
            <li>Add vars to `.env.local`.</li>
            <li>Restart dev server.</li>
            <li>Run `supabase/schema.sql` in SQL Editor.</li>
            <li>Run `supabase/seed.sql` in SQL Editor.</li>
            <li>Refresh this page.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary text-sm" onClick={() => copyText(`OPENAI_API_KEY=\nNEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\nSUPABASE_SERVICE_ROLE_KEY=\nSUPABASE_DB_ENABLED=true\nTASKPILOT_ROBOT_API_KEY=`)}>Copy env template</button>
            <button className="btn-secondary text-sm" onClick={() => copyText(schemaSql)}>Copy schema.sql contents</button>
            <button className="btn-secondary text-sm" onClick={() => copyText(seedSql)}>Copy seed.sql contents</button>
            <button className="btn-secondary text-sm" onClick={() => void recheck()}>Recheck setup</button>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href="/settings/deploy" className="btn-secondary inline-flex">Deployment</Link>
          <Link href="/settings/robot" className="btn-secondary inline-flex">Robot API Test</Link>
          <Link href="/dashboard" className="btn-secondary inline-flex">Back to dashboard</Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">TaskPilot version {TASKPILOT_VERSION}</p>
      </section>
    </main>
  );
}
