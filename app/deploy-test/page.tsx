import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function DeployTestPage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-3xl font-black">TaskPilot deployment test</h1>
        <p className="mb-5 text-slate-300">If you can see this page, routing works.</p>
        <div className="card p-5">
          <p className="mb-3 text-sm text-slate-400">Environment: {process.env.NODE_ENV}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="btn-secondary">/dashboard</Link>
            <Link href="/api/ping" className="btn-secondary">/api/ping</Link>
            <Link href="/api/health" className="btn-secondary">/api/health</Link>
            <Link href="/settings/setup" className="btn-secondary">/settings/setup</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
