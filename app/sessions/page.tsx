'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    const values: SavedSession[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('taskpilot-session-')) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        if (parsed?.session) {
          values.push(parsed.session as SavedSession);
        } else if (parsed?.session_id) {
          values.push({
            id: parsed.session_id,
            workflow_slug: parsed.workflow_slug,
            workflow_name: parsed.workflow_name,
            goal: parsed.goal,
            status: parsed.status,
            current_step: parsed.current_step,
            completed_steps: parsed.completed_steps,
            updated_at: parsed.updated_at,
            sync_status: parsed.sync_status
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

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-2 text-3xl font-black">Saved Sessions</h1>
        <p className="mb-5 text-slate-400">Local sessions are listed first. Supabase sessions appear when sync is enabled.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {sessions.map((session) => (
            <div key={session.id} className="card p-4">
              <p className="text-sm text-slate-400">{session.workflow_name || session.goal || session.workflow_slug || session.workflow_id || 'Workflow session'}</p>
              <p className="text-sm text-slate-300">Status: {session.status || 'active'}</p>
              <p className="text-sm text-slate-300">Current step: {session.current_step || 1}</p>
              <p className="text-sm text-slate-300">Completed: {session.completed_steps?.length || 0}</p>
              <p className="text-xs text-slate-500">Sync status: {session.sync_status || 'local'}</p>
              <div className="mt-3 flex gap-2">
                <Link className="btn-secondary text-sm" href={`/session/${session.workflow_slug || session.workflow_id || 'taskpilot-mvp-build'}?sid=${encodeURIComponent(session.id)}`}>Open</Link>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => {
                    localStorage.removeItem(`taskpilot-session-${session.id}`);
                    if (session.workflow_slug) localStorage.removeItem(`taskpilot-session-${session.workflow_slug}`);
                    setSessions((prev) => prev.filter((item) => item.id !== session.id));
                  }}
                >
                  Delete local copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
