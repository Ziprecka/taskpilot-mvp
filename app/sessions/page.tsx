'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';

interface SavedSession {
  id: string;
  workflow_slug?: string;
  workflow_name?: string;
  workflow_id?: string;
  goal?: string;
  status?: string;
  current_step?: number;
  completed_steps?: number[];
  sync_status?: string;
  updated_at?: string;
  ai_source?: string;
  mode?: string;
  report?: unknown;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'complete'>('all');

  useEffect(() => {
    const values: SavedSession[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('taskpilot-session-')) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (parsed?.session) values.push(parsed.session as SavedSession);
        else if (parsed?.session_id) {
          values.push({
            id: parsed.session_id,
            workflow_slug: parsed.workflow_slug,
            workflow_name: parsed.workflow_name,
            goal: parsed.goal,
            status: parsed.status,
            current_step: parsed.current_step,
            completed_steps: parsed.completed_steps,
            updated_at: parsed.updated_at,
            sync_status: parsed.sync_status,
            ai_source: parsed.ai_source,
            mode: parsed.mode,
            report: parsed.report
          });
        }
      } catch {
        // ignore bad payload
      }
    }
    setSessions(values);
    void fetch('/api/health')
      .then((res) => res.json())
      .then((health) => {
        if (!health?.env?.supabaseEnabled) return;
        return fetch('/api/db/session')
          .then((res) => res.json())
          .then((payload) => {
            if (!payload?.ok || !Array.isArray(payload?.data)) return;
            setSessions((prev) => {
              const map = new Map<string, SavedSession>();
              for (const item of prev) map.set(item.id, item);
              for (const row of payload.data) map.set(row.id, row);
              return Array.from(map.values());
            });
          });
      })
      .catch(() => null);
  }, []);

  const filtered = useMemo(
    () =>
      sessions
        .filter((session) => (statusFilter === 'all' ? true : (session.status || 'active') === statusFilter))
        .filter((session) =>
          `${session.workflow_name || ''} ${session.goal || ''}`.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')),
    [sessions, search, statusFilter]
  );

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Saved Sessions</h1>
        <p className="mb-5 text-slate-400">Search and resume exact workflow state.</p>
        <div className="card mb-4 grid gap-2 p-4 sm:grid-cols-2">
          <input className="input" placeholder="Search sessions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked' | 'complete')}>
            <option value="all">all status</option>
            <option value="active">active</option>
            <option value="blocked">blocked</option>
            <option value="complete">complete</option>
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((session) => {
            const completed = session.completed_steps?.length || 0;
            const percent = Math.min(100, completed * 10);
            return (
              <div key={session.id} className="card p-4">
                <p className="text-sm text-slate-400">{session.workflow_name || session.goal || session.workflow_slug || session.workflow_id || 'Workflow session'}</p>
                <p className="text-sm text-slate-300">Status: {session.status || 'active'} · Step: {session.current_step || 1}</p>
                <p className="text-sm text-slate-300">Percent complete: {percent}% · Sync: {session.sync_status || 'local'}</p>
                <p className="text-xs text-slate-500">AI source: {session.ai_source || 'unknown'} · Report: {session.report ? 'yes' : 'no'}</p>
                <p className="text-xs text-slate-500">Last updated: {session.updated_at || 'unknown'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn-secondary text-sm" href={`/session/${session.workflow_slug || session.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(session.id)}`}>Continue</Link>
                  <Link className="btn-secondary text-sm" href={`/session/${session.workflow_slug || session.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(session.id)}&mode=report`}>Generate Report</Link>
                  <button className="btn-secondary text-sm" onClick={() => setSessions((prev) => [{ ...session, id: `${session.id}-copy-${Date.now()}` }, ...prev])}>Duplicate Session</button>
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => {
                      localStorage.removeItem(`taskpilot-session-${session.id}`);
                      if (session.workflow_slug) localStorage.removeItem(`taskpilot-session-${session.workflow_slug}`);
                      setSessions((prev) => prev.filter((item) => item.id !== session.id));
                    }}
                  >
                    Delete Local Copy
                  </button>
                </div>
              </div>
            );
          })}
          {!filtered.length && <p className="text-sm text-slate-500">No sessions found.</p>}
        </div>
      </section>
    </main>
  );
}
