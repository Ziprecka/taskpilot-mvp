import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function PricingPage() {
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-black">Pricing</h1>
        <p className="mb-5 text-slate-400">TaskPilot is currently in beta. Paid subscriptions are coming soon.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5"><h2 className="text-xl font-bold">Free</h2><p className="text-slate-300">3 generated workflows/month, 5 active sessions.</p><Link href="/signup" className="btn-secondary mt-3 inline-flex">Start Free</Link></div>
          <div className="card p-5"><h2 className="text-xl font-bold">Pro</h2><p className="text-slate-300">Unlimited workflows and sessions, robot API access.</p><button className="btn-secondary mt-3" disabled>Coming Soon</button></div>
          <div className="card p-5"><h2 className="text-xl font-bold">Team</h2><p className="text-slate-300">Shared SOPs, reports, multiple robots.</p><button className="btn-secondary mt-3" disabled>Contact / Coming Soon</button></div>
        </div>
      </section>
    </main>
  );
}
