'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { getReportsStorageKey } from '@/lib/storage';

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const report = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(getReportsStorageKey());
      const list = raw ? JSON.parse(raw) : [];
      return (Array.isArray(list) ? list : []).find((item: any) => item?.id === params.id) || null;
    } catch {
      return null;
    }
  }, [params.id]);

  const debrief = report?.debrief;
  const markdown = report?.markdown || '';
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {!debrief ? (
          <div className="card p-5">
            <h1 className="text-2xl font-black">Report not found</h1>
            <Link href="/reports" className="btn-secondary btn-sm mt-3 inline-flex">Back to reports</Link>
          </div>
        ) : (
          <div className="card p-5">
            <p className="badge mb-2">Daily Debrief</p>
            <h1 className="text-3xl font-black">Daily Debrief · {debrief.date}</h1>
            <p className="mt-3 text-sm text-slate-300">{debrief.summary}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              <p><span className="text-slate-500">Focus minutes:</span> {debrief.focus_minutes}</p>
              <p><span className="text-slate-500">XP earned:</span> +{debrief.xp_earned}</p>
              <p><span className="text-slate-500">Execution score:</span> {debrief.execution_score}/100</p>
              <p><span className="text-slate-500">Money score:</span> {debrief.money_score}/100</p>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Completed:</span> {debrief.completed_outcomes.join(', ') || 'none'}</p>
              <p><span className="text-slate-500">Proof logged:</span> {debrief.proof_logged.join(', ') || 'none'}</p>
              <p><span className="text-slate-500">Biggest win:</span> {debrief.biggest_win}</p>
              <p><span className="text-slate-500">Biggest leak:</span> {debrief.biggest_leak}</p>
              <p><span className="text-slate-500">Lesson learned:</span> {debrief.lesson_learned}</p>
              <p><span className="text-slate-500">Tomorrow first move:</span> {debrief.tomorrow_first_move}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(markdown)}>Copy markdown</button>
              <button className="btn-secondary btn-sm" onClick={() => {
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${debrief.id}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}>Download markdown</button>
              <Link href="/daily" className="btn-ghost btn-sm">Back to Today</Link>
              <button className="btn-ghost btn-sm" onClick={() => {
                localStorage.setItem('taskpilot-next-day-seed', JSON.stringify({
                  date: debrief.date,
                  carry_forward: debrief.carry_forward,
                  tomorrow_first_move: debrief.tomorrow_first_move
                }));
                window.location.href = '/daily';
              }}>Plan tomorrow</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
