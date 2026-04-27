import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function HomePage() {
  const activeStep = 2;
  const steps = ['Confirm parts', 'Connect Arduino', 'Place LED', 'Upload Blink', 'Verify output'];
  return (
    <main>
      <Nav />
      <section className="mx-auto grid max-w-7xl items-start gap-10 px-6 py-14 md:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="badge mb-5">AI Workflow Copilot</div>
          <h1 className="mb-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">GPS for getting things done.</h1>
          <p className="mb-7 max-w-2xl text-lg text-slate-300">Turn repeatable digital or physical tasks into guided execution. TaskPilot tracks your step, checks proof, and keeps momentum without losing context.</p>
          <div className="mb-4 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">Open dashboard</Link>
            <Link href="/workflows/generate" className="btn-secondary">Generate workflow</Link>
            <Link href="/daily" className="btn-secondary">Daily Mode</Link>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Utility Actions</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings/setup" className="btn-ghost btn-sm">Setup</Link>
              <Link href="/settings/deploy" className="btn-ghost btn-sm">Deploy</Link>
              <Link href="/settings/mobile" className="btn-ghost btn-sm">Mobile</Link>
            </div>
          </div>
        </div>
        <div className="card card-hero p-6 shadow-glow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Currently active</p>
              <h2 className="font-black">TaskPilot MVP Build Workflow</h2>
            </div>
            <span className="badge">Guide mode</span>
          </div>
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Progress</span>
              <span>{activeStep}/{steps.length} steps</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${Math.round((activeStep / steps.length) * 100)}%` }} />
            </div>
          </div>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step} className={`rounded-xl border p-4 transition-all ${idx + 1 === activeStep ? 'border-amber-400 bg-amber-400/12' : idx + 1 < activeStep ? 'border-emerald-500/40 bg-emerald-400/10' : 'border-slate-700 bg-slate-950/40'}`}>
                <p className="text-sm font-bold">{idx + 1}. {step}</p>
                <p className="text-xs text-slate-400">
                  {idx + 1 === activeStep ? 'Active now' : idx + 1 < activeStep ? 'Done' : 'Upcoming'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="card card-list p-6">
          <h2 className="mb-4 text-xl font-black">How TaskPilot works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Step 1</p>
              <p className="font-semibold">Generate or choose a workflow</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Step 2</p>
              <p className="font-semibold">Execute one step at a time with AI guidance</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Step 3</p>
              <p className="font-semibold">Save progress, proof, and reports</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
