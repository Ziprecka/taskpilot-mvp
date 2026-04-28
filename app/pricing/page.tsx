'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getProInterestStorageKey } from '@/lib/storage';
import { trackEvent } from '@/lib/trackEvent';
import { readAttribution } from '@/lib/attribution';

export default function PricingPage() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [feature, setFeature] = useState('Pro');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void trackEvent('pricing_viewed', {});
  }, []);

  async function captureInterest() {
    const attribution = readAttribution();
    const item = { id: crypto.randomUUID(), email, feature, created_at: new Date().toISOString() };
    try {
      const raw = localStorage.getItem(getProInterestStorageKey());
      const list = raw ? JSON.parse(raw) : [];
      localStorage.setItem(getProInterestStorageKey(), JSON.stringify([item, ...(Array.isArray(list) ? list : [])].slice(0, 200)));
    } catch {
      // ignore local save failures
    }
    await fetch('/api/db/pro-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, ...attribution })
    }).catch(() => null);
    await trackEvent('pro_interest_clicked', { feature, email, ...attribution });
    setStatus('Saved. We will notify you when early access opens.');
  }

  const plans = [
    {
      name: 'Free Beta',
      cta: 'Start Free',
      href: '/signup',
      points: ['3 playbook generations', '5 active sessions', 'Daily planning + focus', 'Basic reports', 'Local + cloud sync']
    },
    {
      name: 'Pro',
      cta: 'Join Pro waitlist',
      feature: 'Pro',
      price: '$12-$19/mo',
      points: ['Unlimited playbooks and sessions', 'Advanced reports and exports', 'Proof uploads', 'Daily streak/history', 'Robot API access']
    },
    {
      name: 'Operator',
      cta: 'Contact / Coming soon',
      feature: 'Operator',
      price: '$39-$79/mo',
      points: ['Client reports', 'SOP templates', 'Shared process library', 'Team-ready playbooks', 'Priority features']
    }
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="badge mb-2">Beta pricing</p>
        <h1 className="mb-2 text-4xl font-black">Use TaskPilot free during beta.</h1>
        <p className="mb-6 text-slate-300">Plan your day, execute focus blocks, create playbooks, save proof-backed progress, and produce reports.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="card p-5">
              <p className="text-sm text-slate-400">{plan.name}</p>
              {plan.price && <p className="mb-2 text-lg font-bold text-amber-200">{plan.price}</p>}
              <ul className="space-y-1 text-sm text-slate-300">
                {plan.points.map((point) => <li key={point}>- {point}</li>)}
              </ul>
              {plan.href ? (
                <Link href={plan.href} className="btn-primary mt-4 inline-flex">{plan.cta}</Link>
              ) : (
                <button className="btn-secondary mt-4" onClick={() => { setFeature(plan.feature || plan.name); setShowModal(true); }}>
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl font-black">Who is this for?</h2>
            <p className="mt-2 text-sm text-slate-300">Solo operators, indie builders, freelancers, service businesses, and anyone who needs execution pressure.</p>
          </div>
          <div className="card p-5">
            <h2 className="text-xl font-black">What you get every day</h2>
            <p className="mt-2 text-sm text-slate-300">Top 3 outcomes, one focus block, proof log, daily report, and reusable workflows.</p>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-black">Pro is coming soon</h2>
            <p className="mt-1 text-sm text-slate-400">Join early access for {feature} features.</p>
            <input className="input mt-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <button className="btn-primary" onClick={() => void captureInterest()}>Join early access</button>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Close</button>
            </div>
            {status && <p className="mt-2 text-sm text-emerald-300">{status}</p>}
          </div>
        </div>
      )}
    </main>
  );
}

