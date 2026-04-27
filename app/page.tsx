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
          <h1 className="mb-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">Turn today&apos;s goals into completed work.</h1>
          <p className="mb-7 max-w-2xl text-lg text-slate-300">Write your goals. TaskPilot turns them into outcomes, focus blocks, proof, and a daily debrief.</p>
          <div className="mb-4 flex flex-wrap gap-3">
            <Link href="/signup?next=/daily" className="btn-primary">Plan today</Link>
            <Link href="/demo" className="btn-secondary">Try the demo</Link>
            <Link href="/workflows/generate" className="btn-ghost">Generate a playbook</Link>
          </div>
          <div className="grid max-w-xl grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-1">3 outcomes</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-1">25-min focus</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-1">Proof logged</div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-2 py-1">Daily debrief</div>
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
              <p className="font-semibold">Log proof and generate debrief reports</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="card p-6">
          <h2 className="mb-4 text-xl font-black">Built for people who need execution pressure</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Solo operators', 'Too many loose tasks.', 'Turn the day into 3 proof-backed outcomes.'],
              ['Indie builders', 'Shipping gets delayed by context switching.', 'Run one clear next move until proof is logged.'],
              ['Freelancers', 'Client work and internal work compete.', 'Prioritize by leverage and close loops faster.'],
              ['Service owners', 'Operations and growth work collide.', 'Use Today as a queue for highest-impact actions.']
            ].map(([title, pain, outcome]) => (
              <div key={title} className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{pain}</p>
                <p className="mt-1 text-sm text-amber-200">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="card p-6">
          <h2 className="mb-4 text-xl font-black">Not another to-do list.</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-200">To-do apps</p>
              <p className="text-sm text-slate-400">Store tasks, get cluttered, and rarely prove progress.</p>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-200">TaskPilot</p>
              <p className="text-sm text-slate-200">Picks next move, runs focus blocks, logs proof, creates debriefs, and builds reusable playbooks.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
