import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function DemoPage() {
  const demoSteps = [
    'Generate workflow from real goal',
    'Start workflow session',
    'Ask AI what next',
    'Upload/check proof',
    'Mark steps complete',
    'Generate report',
    'Show robot readiness'
  ];
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="badge mb-2">Demo Mode</p>
        <h1 className="mb-2 text-3xl font-black">TaskPilot beta product demo</h1>
        <p className="mb-4 text-slate-400">A polished walkthrough script using mock data for recording and live demos.</p>
        <div className="card p-5">
          <ol className="list-inside list-decimal space-y-2 text-slate-300">
            {demoSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/workflows/generate" className="btn-primary">Try with your own workflow</Link>
            <Link href="/session/taskpilot-mvp-build" className="btn-secondary">Open build session</Link>
            <Link href="/settings/robot" className="btn-secondary">Robot readiness</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
