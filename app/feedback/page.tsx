'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getFeedbackStorageKey } from '@/lib/storage';

type FeedbackItem = {
  id: string;
  type: string;
  severity: string;
  area: string;
  description: string;
  expected_behavior: string;
  proof_url: string;
  status: string;
  created_at: string;
};

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [form, setForm] = useState({
    type: 'bug',
    severity: 'medium',
    area: '',
    description: '',
    expected_behavior: '',
    proof_url: '',
    status: 'open'
  });
  const [supabaseEnabled, setSupabaseEnabled] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(getFeedbackStorageKey()) || '[]'));
    } catch {
      setItems([]);
    }
    void fetch('/api/health').then((res) => res.json()).then((data) => setSupabaseEnabled(Boolean(data?.env?.supabaseEnabled))).catch(() => null);
  }, []);

  function saveLocal(next: FeedbackItem[]) {
    setItems(next);
    localStorage.setItem(getFeedbackStorageKey(), JSON.stringify(next));
  }

  async function submit() {
    const item: FeedbackItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...form };
    const next = [item, ...items];
    saveLocal(next);
    if (supabaseEnabled) {
      await fetch('/api/db/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).catch(() => null);
    }
    setForm({ type: 'bug', severity: 'medium', area: '', description: '', expected_behavior: '', proof_url: '', status: 'open' });
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Beta Feedback</h1>
        <p className="mb-5 text-slate-400">Log what feels broken, confusing, or useful.</p>
        <div className="card mb-4 grid gap-2 p-4 md:grid-cols-2">
          <select className="input" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
            <option value="bug">bug</option>
            <option value="UX issue">UX issue</option>
            <option value="feature idea">feature idea</option>
            <option value="AI quality issue">AI quality issue</option>
            <option value="workflow issue">workflow issue</option>
            <option value="robot issue">robot issue</option>
          </select>
          <select className="input" value={form.severity} onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <input className="input md:col-span-2" placeholder="Page/area" value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} />
          <textarea className="input md:col-span-2 min-h-20" placeholder="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          <textarea className="input md:col-span-2 min-h-16" placeholder="Expected behavior" value={form.expected_behavior} onChange={(e) => setForm((prev) => ({ ...prev, expected_behavior: e.target.value }))} />
          <input className="input md:col-span-2" placeholder="Screenshot/proof URL (optional)" value={form.proof_url} onChange={(e) => setForm((prev) => ({ ...prev, proof_url: e.target.value }))} />
          <select className="input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="open">open</option>
            <option value="reviewing">reviewing</option>
            <option value="fixed">fixed</option>
          </select>
        </div>
        <button className="btn-primary mb-4" onClick={submit}>Save Feedback</button>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <p className="text-sm text-slate-400">{item.type} · {item.severity} · {item.status}</p>
              <p className="font-semibold text-white">{item.area || 'General'}</p>
              <p className="text-sm text-slate-300">{item.description}</p>
            </div>
          ))}
          {!items.length && <p className="text-sm text-slate-500">No feedback logged yet.</p>}
        </div>
      </section>
    </main>
  );
}
