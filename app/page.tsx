import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function HomePage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="badge mb-5">AI Workflow Copilot</div>
          <h1 className="mb-6 max-w-4xl text-5xl font-black leading-tight md:text-7xl">GPS for getting things done.</h1>
          <p className="mb-8 max-w-2xl text-lg text-slate-300">TaskPilot turns repeatable physical and digital tasks into guided workflows. It tracks your current step, asks for proof, checks your work, and pushes you to the next action.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">Open dashboard</Link>
            <Link href="/workflows/generate" className="btn-secondary">Generate Custom Workflow</Link>
            <Link href="/daily" className="btn-secondary">Daily Mode</Link>
            <Link href="/settings/setup" className="btn-secondary">Setup</Link>
            <Link href="/settings/deploy" className="btn-secondary">Deploy</Link>
            <Link href="/settings/mobile" className="btn-secondary">Mobile</Link>
          </div>
        </div>
        <div className="card p-6 shadow-glow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">Active Workflow</h2>
            <span className="badge">Guide mode</span>
          </div>
          <div className="space-y-3">
            {['Confirm parts', 'Connect Arduino', 'Place LED', 'Upload Blink', 'Verify output'].map((step, idx) => (
              <div key={step} className={`rounded-xl border p-4 ${idx === 0 ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-950/40'}`}>
                <p className="text-sm font-bold">{idx + 1}. {step}</p>
                <p className="text-xs text-slate-400">{idx === 0 ? 'Current next action' : 'Waiting'}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
