import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function HomePage() {
  const activeStep = 2;
  const steps = ['Plan top 3 outcomes', 'Start focus block', 'Log proof', 'Generate report', 'Carry forward'];
  return (
    <main>
      <Nav />
      <section className="mx-auto grid max-w-7xl items-start gap-10 px-6 py-14 md:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="badge mb-5">Daily Execution System</div>
          <h1 className="mb-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">Turn goals into completed work.</h1>
          <p className="mb-7 max-w-2xl text-lg text-slate-300">TaskPilot helps you plan today&apos;s top outcomes, execute one focused step at a time, prove progress, and generate reports you can build on.</p>
          <div className="mb-4 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">Start today&apos;s plan</Link>
            <Link href="/workflows/generate" className="btn-secondary">Generate workflow</Link>
            <Link href="/demo" className="btn-ghost">Watch demo</Link>
          </div>
        </div>
        <div className="card card-hero p-6 shadow-glow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Currently active</p>
              <h2 className="font-black">Today&apos;s execution loop</h2>
            </div>
            <span className="badge">Operator view</span>
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
              <p className="font-semibold">Plan proof-backed outcomes</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Step 2</p>
              <p className="font-semibold">Run focused execution blocks</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Step 3</p>
              <p className="font-semibold">Log proof and generate progress reports</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
