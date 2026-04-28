'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { trackProductEvent } from '@/lib/productEvents';
import { readAttribution } from '@/lib/attribution';

const STORAGE_KEY = 'taskpilot-onboarding-complete';
const PREFS_KEY = 'taskpilot-user-preferences';

type UseCase = 'Run my day' | 'Build a project' | 'Grow a business' | 'Create SOPs' | 'Learn/build skills' | 'Manage client work';
type WorkType = 'money/sales' | 'building/shipping' | 'admin/operations' | 'content/marketing' | 'research/decisions' | 'personal productivity';
type CoachingStyle = 'direct' | 'balanced' | 'supportive' | 'technical';
type FirstAction = 'plan today' | 'generate a workflow' | 'continue an existing project' | 'create a report' | 'try demo mode';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [health, setHealth] = useState<any>(null);
  const [primaryUseCase, setPrimaryUseCase] = useState<UseCase>('Run my day');
  const [workType, setWorkType] = useState<WorkType>('building/shipping');
  const [coachingStyle, setCoachingStyle] = useState<CoachingStyle>('balanced');
  const [firstAction, setFirstAction] = useState<FirstAction>('plan today');
  const [xHandle, setXHandle] = useState('');

  useEffect(() => {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
    const attr = readAttribution();
    if (attr?.x_handle) setXHandle(attr.x_handle.replace(/^@/, ''));
  }, []);

  async function complete() {
    localStorage.setItem(STORAGE_KEY, 'true');
    const prefs = {
      primary_use_case: primaryUseCase,
      work_type: workType,
      coaching_style: coachingStyle,
      first_action: firstAction,
      onboarding_completed_at: new Date().toISOString()
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    await trackProductEvent('onboarding_complete', '/onboarding', prefs);
    void fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_complete: true })
    }).catch(() => null);
    void fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_handle: xHandle || undefined })
    }).catch(() => null);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="badge mb-2">Onboarding</p>
        <h1 className="mb-2 text-3xl font-black">Plan the day. Execute the next move. Prove progress.</h1>
        <p className="mb-5 text-slate-400">Step {step} of 5</p>

        {step === 1 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">What are you using TaskPilot for?</h2>
            <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">
              <p className="font-semibold text-white">How TaskPilot works</p>
              <p><span className="text-slate-500">Home:</span> shows what to do next.</p>
              <p><span className="text-slate-500">Today:</span> outcomes, focus blocks, proof, XP, debrief.</p>
              <p><span className="text-slate-500">Playbooks:</span> reusable workflows you can run again.</p>
              <p><span className="text-slate-500">Reports:</span> history of what you completed, proved, and learned.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['Run my day', 'Build a project', 'Grow a business', 'Create SOPs', 'Learn/build skills', 'Manage client work'] as UseCase[]).map((item) => (
                <button key={item} className={`rounded-xl border p-3 text-left text-sm ${primaryUseCase === item ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-slate-700 bg-slate-950/40 text-slate-200'}`} onClick={() => setPrimaryUseCase(item)}>
                  {item}
                </button>
              ))}
            </div>
            <input className="input mt-3" placeholder="X handle (optional)" value={xHandle} onChange={(e) => setXHandle(e.target.value.replace(/^@/, ''))} />
          </div>
        )}

        {step === 2 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">What kind of work do you want to complete more consistently?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['money/sales', 'building/shipping', 'admin/operations', 'content/marketing', 'research/decisions', 'personal productivity'] as WorkType[]).map((item) => (
                <button key={item} className={`rounded-xl border p-3 text-left text-sm ${workType === item ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-slate-700 bg-slate-950/40 text-slate-200'}`} onClick={() => setWorkType(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">What coaching style do you want?</h2>
            <div className="grid gap-2 sm:grid-cols-4">
              {(['direct', 'balanced', 'supportive', 'technical'] as CoachingStyle[]).map((item) => (
                <button key={item} className={`rounded-xl border p-3 text-sm ${coachingStyle === item ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-slate-700 bg-slate-950/40 text-slate-200'}`} onClick={() => setCoachingStyle(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">What should TaskPilot help you do first?</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['plan today', 'generate a workflow', 'continue an existing project', 'create a report', 'try demo mode'] as FirstAction[]).map((item) => (
                <button key={item} className={`rounded-xl border p-3 text-left text-sm ${firstAction === item ? 'border-amber-400 bg-amber-400/10 text-amber-100' : 'border-slate-700 bg-slate-950/40 text-slate-200'}`} onClick={() => setFirstAction(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="card p-5">
            <h2 className="mb-3 text-2xl font-black">You are ready</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>OpenAI connected: {health?.env?.openai?.detected ? 'yes' : 'no'}</p>
              <p>Supabase connected: {health?.env?.supabase?.urlDetected && health?.env?.supabase?.anonKeyDetected ? 'yes' : 'no'}</p>
              <p>PWA ready: yes</p>
              <p>First action: {firstAction}</p>
            </div>
            <Link
              onClick={() => void complete()}
              href={firstAction === 'plan today' ? '/daily' : firstAction === 'generate a workflow' ? '/workflows/generate' : firstAction === 'create a report' ? '/reports' : firstAction === 'try demo mode' ? '/demo' : '/dashboard'}
              className="btn-primary mt-4 inline-flex"
            >
              Start now
            </Link>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button className="btn-secondary" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</button>
          {step < 5 ? (
            <button className="btn-primary" onClick={() => setStep((s) => Math.min(5, s + 1))}>Next</button>
          ) : (
            <Link onClick={() => void complete()} href="/dashboard" className="btn-secondary">Skip</Link>
          )}
        </div>
      </section>
    </main>
  );
}

