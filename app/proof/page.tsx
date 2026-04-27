'use client';

import { useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getStorageUserKey } from '@/lib/storage';

type VaultItem = {
  id: string;
  date: string;
  type: 'daily_outcome' | 'workflow' | 'lesson' | 'report';
  title: string;
  note: string;
  status: string;
  data_url?: string;
  stored_locally?: boolean;
};

export default function ProofPage() {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'workflows' | 'daily' | 'lessons'>('all');
  const items = useMemo(() => {
    if (typeof window === 'undefined') return [] as VaultItem[];
    const user = getStorageUserKey();
    const next: VaultItem[] = [];
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`taskpilot-daily-${user}-`)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          (parsed?.outcomes || []).forEach((outcome: any) => {
            if (outcome?.proof_provided) {
              next.push({ id: outcome.id, date: outcome.updated_at || new Date().toISOString(), type: 'daily_outcome', title: outcome.title, note: outcome.proof_provided, status: outcome.status });
            }
            if (outcome?.status === 'done') {
              next.push({ id: `${outcome.id}-done`, date: outcome.completed_at || outcome.updated_at || new Date().toISOString(), type: 'daily_outcome', title: `Completed: ${outcome.title}`, note: 'Outcome completed', status: 'done' });
            }
          });
          (parsed?.proof_items || []).forEach((proof: any) => {
            next.push({
              id: proof.id,
              date: proof.created_at || new Date().toISOString(),
              type: 'daily_outcome',
              title: `Proof: ${parsed?.outcomes?.find((o: any) => o.id === proof.outcome_id)?.title || 'Outcome'}`,
              note: proof.note || proof.file_name || 'Proof item',
              status: proof.type || 'proof',
              data_url: proof.data_url,
              stored_locally: true
            });
          });
          (parsed?.lessons || []).forEach((lesson: any) => {
            next.push({ id: lesson.id, date: lesson.created_at || new Date().toISOString(), type: 'lesson', title: lesson.lesson_title, note: lesson.summary, status: 'captured' });
          });
          if (parsed?.report) {
            next.push({ id: parsed.report.id, date: parsed.report.created_at || new Date().toISOString(), type: 'report', title: `Debrief: ${parsed.report.date}`, note: parsed.report.summary, status: 'saved' });
          }
        } catch {
          // ignore
        }
      }
      if (key.startsWith(`taskpilot-session-${user}-`)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed?.report?.summary) {
            next.push({ id: parsed.report.id || key, date: parsed.report.created_at || new Date().toISOString(), type: 'workflow', title: parsed.report.workflow_name || 'Workflow report', note: parsed.report.summary, status: 'saved' });
          }
        } catch {
          // ignore
        }
      }
    });
    return next.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return items.filter((item) => {
      const d = new Date(item.date);
      if (filter === 'today') return d.toDateString() === now.toDateString();
      if (filter === 'week') return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
      if (filter === 'workflows') return item.type === 'workflow' || item.type === 'report';
      if (filter === 'daily') return item.type === 'daily_outcome';
      if (filter === 'lessons') return item.type === 'lesson';
      return true;
    });
  }, [items, filter]);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="badge mb-2">Evidence Vault</p>
        <h1 className="text-3xl font-black">Proof-backed progress archive</h1>
        <p className="mb-4 text-slate-400">Evidence, lessons, completed outcomes, and reports accumulate here.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(['all', 'today', 'week', 'workflows', 'daily', 'lessons'] as const).map((option) => (
            <button key={option} className={`btn-secondary btn-sm ${filter === option ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setFilter(option)}>
              {option}
            </button>
          ))}
        </div>
        <div className="card p-5">
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString()} · {item.type} · {item.status}</p>
                <p className="text-slate-300">{item.note}</p>
                {item.data_url && <img src={item.data_url} alt="proof preview" className="mt-2 max-h-36 rounded border border-slate-700 object-contain" />}
                {item.stored_locally && <p className="mt-1 text-xs text-slate-500">Stored locally for now</p>}
              </div>
            ))}
            {!filtered.length && <p className="text-sm text-slate-500">No evidence yet. Log proof and close your day to build the vault.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

