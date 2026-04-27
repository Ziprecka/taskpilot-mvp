'use client';

import { useMemo } from 'react';
import { Nav } from '@/components/Nav';
import { getStorageUserKey } from '@/lib/storage';

type ProofItem = {
  id: string;
  date: string;
  source: 'daily' | 'workflow';
  title: string;
  note: string;
  status: string;
  related_report: string;
};

export default function ProofPage() {
  const items = useMemo(() => {
    if (typeof window === 'undefined') return [] as ProofItem[];
    const user = getStorageUserKey();
    const next: ProofItem[] = [];
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`taskpilot-daily-${user}-`)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          const outcomes = Array.isArray(parsed?.outcomes) ? parsed.outcomes : [];
          outcomes.forEach((outcome: any) => {
            if (outcome?.proof_provided) {
              next.push({
                id: outcome.id,
                date: outcome.updated_at || new Date().toISOString(),
                source: 'daily',
                title: outcome.title,
                note: outcome.proof_provided,
                status: outcome.status,
                related_report: parsed?.report?.id || 'n/a'
              });
            }
          });
        } catch {
          // ignore invalid data
        }
      }
    });
    return next.sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="badge mb-2">Proof Log</p>
        <h1 className="text-3xl font-black">Proof-backed execution history</h1>
        <p className="mb-5 text-slate-400">Every logged proof note across Daily outcomes and workflow execution appears here.</p>
        <div className="card p-5">
          <div className="grid grid-cols-[1.1fr_.8fr_1.4fr_.6fr_.7fr] gap-2 text-xs uppercase tracking-wider text-slate-500">
            <p>Date</p><p>Source</p><p>Outcome / Workflow</p><p>Status</p><p>Report</p>
          </div>
          <div className="mt-2 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                <div className="grid grid-cols-[1.1fr_.8fr_1.4fr_.6fr_.7fr] gap-2 text-sm">
                  <p>{new Date(item.date).toLocaleString()}</p>
                  <p>{item.source}</p>
                  <p>{item.title}<span className="block text-xs text-slate-500">{item.note}</span></p>
                  <p>{item.status}</p>
                  <p>{item.related_report}</p>
                </div>
              </div>
            ))}
            {!items.length && <p className="text-sm text-slate-500">No proof logged yet. Log proof from Daily focus or workflow sessions.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

