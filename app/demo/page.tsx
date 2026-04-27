'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';

const PERSONAS = [
  { id: 'solo', label: 'Solo business owner', plan: ['Send 10 targeted outreach messages', 'Follow up with 5 warm leads', 'Draft one offer improvement'] },
  { id: 'builder', label: 'Indie builder', plan: ['Ship one scoped feature', 'Fix one visible UX issue', 'Record a demo proving improvement'] },
  { id: 'freelancer', label: 'Freelancer', plan: ['Close one client deliverable', 'Send progress update with proof', 'Create tomorrow handoff checklist'] },
  { id: 'student', label: 'Student / learner', plan: ['Learn one concept with notes', 'Build one tiny artifact', 'Write 3 reflection takeaways'] }
];

export default function DemoPage() {
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [started, setStarted] = useState(false);
  const [proof, setProof] = useState('');
  const [reportReady, setReportReady] = useState(false);
  const completedCount = useMemo(() => (started ? (proof ? 2 : 1) : 0), [started, proof]);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="badge mb-2">Interactive demo</p>
        <h1 className="mb-2 text-3xl font-black">Plan. Focus. Prove. Report.</h1>
        <p className="mb-5 text-slate-300">Pick a persona and walk through the core execution loop in under 2 minutes.</p>

        <div className="card mb-4 p-5">
          <h2 className="text-lg font-black">1) Pick demo persona</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {PERSONAS.map((item) => (
              <button key={item.id} className={`btn-secondary btn-sm ${persona.id === item.id ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => { setPersona(item); setStarted(false); setProof(''); setReportReady(false); }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-black">2) Today&apos;s generated plan</h2>
            <div className="mt-2 space-y-2">
              {persona.plan.map((item, idx) => (
                <div key={item} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                  <p className="font-semibold">#{idx + 1} {item}</p>
                  <p className="text-xs text-slate-500">Proof required: visible artifact or note.</p>
                </div>
              ))}
            </div>
            <button className="btn-primary btn-sm mt-3" onClick={() => setStarted(true)}>3) Start focus simulation</button>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-black">Execution state</h2>
            <p className="mt-2 text-sm text-slate-300">Focus started: {started ? 'yes' : 'no'}</p>
            <p className="text-sm text-slate-300">Progress steps complete: {completedCount}/3</p>
            <textarea className="input mt-3 min-h-20" placeholder="4) Simulate proof note..." value={proof} onChange={(e) => setProof(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setProof('Sent 10 messages and logged replies in sheet.')}>Simulate proof submission</button>
              <button className="btn-secondary btn-sm" onClick={() => setReportReady(true)}>5) Simulate report generation</button>
            </div>
            {reportReady && (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-400/10 p-3 text-sm">
                <p className="font-semibold text-emerald-200">Report generated</p>
                <p>Completed: {persona.plan[0]}</p>
                <p>Next move tomorrow: {persona.plan[1]}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card mt-4 p-5">
          <h2 className="text-lg font-black">6) Start your real execution loop</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/daily" className="btn-primary">Start your own plan</Link>
            <Link href="/signup" className="btn-secondary">Create account</Link>
            <Link href="/workflows/generate" className="btn-secondary">Generate workflow</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

