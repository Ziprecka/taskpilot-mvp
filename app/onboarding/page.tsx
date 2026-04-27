'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

const STORAGE_KEY = 'taskpilot-onboarding-complete';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
  }, []);

  function complete() {
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="badge mb-2">Onboarding</p>
        <h1 className="mb-2 text-3xl font-black">Get started in under 60 seconds</h1>
        <p className="mb-5 text-slate-400">Step {step} of 4</p>

        {step === 1 && (
          <div className="card p-5">
            <h2 className="mb-2 text-2xl font-black">TaskPilot is GPS for getting things done.</h2>
            <p className="text-slate-300">Turn messy goals into guided workflows. TaskPilot tracks your current step, asks for proof, helps debug blockers, and saves progress.</p>
          </div>
        )}

        {step === 2 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">Pick how you want to use it.</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Build a project', 'Debug a problem', 'Generate a workflow', 'Run today’s top 3 outcomes', 'Prepare for robot mode'].map((item) => (
                <div key={item} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-200">{item}</div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">Start with a recommended workflow.</h2>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-secondary" href="/session/taskpilot-mvp-build">Build TaskPilot MVP</Link>
              <Link className="btn-secondary" href="/session/deploy-taskpilot-vercel">Deploy to Vercel</Link>
              <Link className="btn-secondary" href="/workflows/generate">Create a custom workflow</Link>
              <Link className="btn-secondary" href="/daily">Open Daily Mode</Link>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">Your setup status.</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>OpenAI connected: {health?.env?.openai?.detected ? 'yes' : 'no'}</p>
              <p>Supabase connected: {health?.env?.supabase?.urlDetected && health?.env?.supabase?.anonKeyDetected ? 'yes' : 'no'}</p>
              <p>PWA ready: yes</p>
              <p>Robot API key configured: {health?.env?.robot?.apiKeyDetected ? 'yes' : 'no'}</p>
            </div>
            <Link onClick={complete} href="/dashboard" className="btn-primary mt-4 inline-flex">Enter Dashboard</Link>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button className="btn-secondary" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>
          {step < 4 ? (
            <button className="btn-primary" onClick={() => setStep((s) => Math.min(4, s + 1))}>Next</button>
          ) : (
            <Link onClick={complete} href="/dashboard" className="btn-secondary">Skip</Link>
          )}
        </div>
      </section>
    </main>
  );
}
