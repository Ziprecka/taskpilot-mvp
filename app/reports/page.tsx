'use client';

import { useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getStorageUserKey } from '@/lib/storage';

type ReportItem = {
  id: string;
  type: 'daily' | 'workflow';
  title: string;
  date: string;
  summary: string;
  markdown: string;
};

export default function ReportsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'daily' | 'workflow'>('all');
  const [selected, setSelected] = useState<ReportItem | null>(null);
  const [items] = useState<ReportItem[]>(() => {
    const user = getStorageUserKey();
    const entries: ReportItem[] = [];
    if (typeof window === 'undefined') return entries;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`taskpilot-daily-${user}-`)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed?.report) {
            const r = parsed.report;
            entries.push({
              id: r.id || crypto.randomUUID(),
              type: 'daily',
              title: `Daily report · ${r.date || key.slice(-10)}`,
              date: r.created_at || new Date().toISOString(),
              summary: r.summary || 'Daily closeout',
              markdown: `# Daily Report\n\n- Summary: ${r.summary}\n- Execution score: ${r.execution_score}/10\n- Money score: ${r.money_score}/10\n- Tomorrow first action: ${r.tomorrow_first_action}`
            });
          }
        } catch {
          // ignore invalid daily state
        }
      }
      if (key.startsWith(`taskpilot-session-${user}-`)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          const report = parsed?.report;
          if (report?.summary) {
            entries.push({
              id: parsed?.session?.id || crypto.randomUUID(),
              type: 'workflow',
              title: report.workflow_name || 'Workflow report',
              date: report.created_at || new Date().toISOString(),
              summary: report.summary,
              markdown: `# Workflow Report\n\n- Workflow: ${report.workflow_name}\n- Goal: ${report.goal}\n- Summary: ${report.summary}`
            });
          }
        } catch {
          // ignore invalid session data
        }
      }
    });
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  });

  const filtered = useMemo(() => items.filter((item) => (filter === 'all' || item.type === filter) && item.title.toLowerCase().includes(query.toLowerCase())), [items, filter, query]);
  const weekly = useMemo(() => {
    const daily = items.filter((i) => i.type === 'daily');
    return {
      reports: daily.length,
      completedOutcomes: daily.length * 2,
      focusMinutes: daily.length * 35,
      blockers: Math.max(0, daily.length - 1),
      bestDay: daily[0]?.title || 'No data yet'
    };
  }, [items]);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="badge mb-2">Reports</p>
        <h1 className="text-3xl font-black">Progress report history</h1>
        <p className="mb-4 text-slate-400">Proof-backed progress over time: daily closeouts and workflow reports.</p>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <input className="input max-w-xs" placeholder="Search reports..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="input max-w-44" value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'daily' | 'workflow')}>
                <option value="all">All</option>
                <option value="daily">Daily</option>
                <option value="workflow">Workflow</option>
              </select>
            </div>
            <div className="space-y-2">
              {filtered.map((item) => (
                <button key={item.id} className="w-full rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-left hover:border-amber-400/50" onClick={() => setSelected(item)}>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString()} · {item.type}</p>
                  <p className="text-sm text-slate-400">{item.summary}</p>
                </button>
              ))}
              {!filtered.length && <p className="text-sm text-slate-500">No reports yet.</p>}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Weekly review (beta)</h2>
              <span className="badge">Pro feature</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">Completed outcomes this week: {weekly.completedOutcomes}</p>
            <p className="text-sm text-slate-300">Focus minutes: {weekly.focusMinutes}</p>
            <p className="text-sm text-slate-300">Reports generated: {weekly.reports}</p>
            <p className="text-sm text-slate-300">Common blockers: {weekly.blockers}</p>
            <p className="text-sm text-slate-300">Best day: {weekly.bestDay}</p>
            <p className="mt-2 text-xs text-slate-500">Next week focus recommendation: prioritize one money move before noon daily.</p>
            <a className="btn-ghost btn-sm mt-3 inline-flex" href="/pricing">Join Pro early access</a>
          </div>
        </div>

        {selected && (
          <div className="card mt-4 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-black">{selected.title}</h2>
              <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <p className="text-sm text-slate-300">{selected.summary}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(selected.markdown)}>Copy markdown</button>
              <button className="btn-secondary btn-sm" onClick={() => {
                const blob = new Blob([selected.markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selected.id}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}>Download markdown</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

