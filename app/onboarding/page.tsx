'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

const STORAGE_KEY = 'taskpilot-onboarding-complete';
const PREFS_KEY = 'taskpilot-user-preferences';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [health, setHealth] = useState<any>(null);
  const [primaryUseCase, setPrimaryUseCase] = useState('personal productivity');
  const [firstGoal, setFirstGoal] = useState('plan my day');
  const [coachingStyle, setCoachingStyle] = useState('balanced');

  useEffect(() => {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
  }, []);

  function complete() {
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      primary_use_case: primaryUseCase,
      first_goal: firstGoal,
      coaching_style: coachingStyle,
      preferred_workflow_categories: [primaryUseCase.includes('coding') ? 'coding' : primaryUseCase.includes('business') ? 'business_sop' : 'productivity']
    }));
    void fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_complete: true })
    }).catch(() => null);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="badge mb-2">Onboarding</p>
        <h1 className="mb-2 text-3xl font-black">Get started in under 60 seconds</h1>
        <p className="mb-5 text-slate-400">Step {step} of 5</p>

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
            <h2 className="mb-3 text-2xl font-black">Personalize your coach</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Primary use case</p>
                <select className="input" value={primaryUseCase} onChange={(e) => setPrimaryUseCase(e.target.value)}>
                  <option>personal productivity</option>
                  <option>business operations</option>
                  <option>coding/building</option>
                  <option>research</option>
                  <option>learning</option>
                  <option>physical tasks</option>
                  <option>service business workflows</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">First goal</p>
                <select className="input" value={firstGoal} onChange={(e) => setFirstGoal(e.target.value)}>
                  <option>plan my day</option>
                  <option>create a workflow</option>
                  <option>debug a blocker</option>
                  <option>build an SOP</option>
                  <option>research a decision</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Coaching style</p>
                <select className="input" value={coachingStyle} onChange={(e) => setCoachingStyle(e.target.value)}>
                  <option>direct and strict</option>
                  <option>balanced</option>
                  <option>supportive</option>
                  <option>technical</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">Start with a recommended workflow.</h2>
            <div className="flex flex-wrap gap-2">
              <Link className="btn-secondary" href="/session/daily-top-3-planning">Plan Today&apos;s Top 3</Link>
              <Link className="btn-secondary" href="/session/sales-outreach-list">Build Outreach List</Link>
              <Link className="btn-secondary" href="/workflows/generate">Create a custom workflow</Link>
              <Link className="btn-secondary" href="/daily">Open Daily Mode</Link>
            </div>
          </div>
        )}

        {step === 5 && (
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
          {step < 5 ? (
            <button className="btn-primary" onClick={() => setStep((s) => Math.min(5, s + 1))}>Next</button>
          ) : (
            <Link onClick={complete} href="/dashboard" className="btn-secondary">Skip</Link>
          )}
        </div>
      </section>
    </main>
  );
}
