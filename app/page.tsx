import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function HomePage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto grid max-w-7xl items-start gap-10 px-6 py-14 md:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="badge mb-5">Daily Execution System</div>
          <h1 className="mb-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">Finish the day with proof.</h1>
          <p className="mb-7 max-w-2xl text-lg text-slate-300">TaskPilot turns messy goals into focused missions, concrete next actions, proof checklists, and daily reports.</p>
          <div className="mb-4 flex flex-wrap gap-3">
            <Link href="/signup?next=/daily" className="btn-primary">Plan Today</Link>
            <Link href="/demo" className="btn-secondary">Watch Demo</Link>
            <Link href="/workflows/generate" className="text-sm text-amber-200 hover:text-amber-100">Create Playbook</Link>
          </div>
          <p className="text-sm text-slate-400">Not another task list — an execution system that keeps pushing until work is proven.</p>
        </div>
        <div className="card card-hero p-6 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product preview</p>
          <h2 className="mt-1 font-black">Goal: "Get a real result today."</h2>
          <p className="mt-3 text-sm text-slate-300">TaskPilot turns it into:</p>
          <ol className="mt-2 space-y-2 text-sm text-slate-200">
            <li>1. Choose the highest-leverage outcome</li>
            <li>2. Break it into one active mission</li>
            <li>3. Generate the first action or draft</li>
            <li>4. Capture proof</li>
            <li>5. Close with a report</li>
          </ol>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="mb-4 text-xl font-black">How TaskPilot works</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
            <p className="text-xs text-slate-500">Step 1</p>
            <p className="font-semibold">Plan</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
            <p className="text-xs text-slate-500">Step 2</p>
            <p className="font-semibold">Execute</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
            <p className="text-xs text-slate-500">Step 3</p>
            <p className="font-semibold">Prove</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
            <p className="text-xs text-slate-500">Step 4</p>
            <p className="font-semibold">Report</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="card p-6">
          <h2 className="mb-4 text-xl font-black">Built for real work</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Business Growth', 'Goal examples: get leads, send outreach, follow up, close revenue', 'Output: prospect list, messages, follow-up plan', 'Proof: sends, replies, outcomes'],
              ['Build Projects', 'Goal examples: ship a SaaS feature, fix a bug, launch a page', 'Output: scope, implementation checklist, test proof', 'Proof: commit, test output, release note'],
              ['Physical Work', 'Goal examples: service day, organize workspace, hardware setup', 'Output: prep checklist, execution steps, photo proof', 'Proof: before/after and completion report'],
              ['Learning / Research', 'Goal examples: study a topic, compare tools, validate an idea', 'Output: research path, notes, decision criteria', 'Proof: summary and decision note']
            ].map(([title, goal, missions, proof]) => (
              <div key={title} className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{goal}</p>
                <p className="mt-1 text-sm text-slate-300">{missions}</p>
                <p className="mt-1 text-sm text-amber-200">{proof}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="card p-6">
          <h2 className="mb-4 text-xl font-black">Built for messy goals</h2>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ['Too broad?', 'TaskPilot gives possible paths.'],
              ['Too vague?', 'TaskPilot makes a practical assumption.'],
              ['Too complex?', 'TaskPilot breaks it into missions.'],
              ['Too distracting?', 'TaskPilot gives one next move.'],
              ['Too easy to fake?', 'TaskPilot asks for proof.']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
