'use client';

import { useEffect, useMemo, useState } from 'react';

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  source: string;
  x_handle: string;
  created_at: string;
  last_active_at: string;
  plan: string;
  subscription_status: string;
  onboarding_complete: boolean;
  daily_plans_count: number;
  missions_started_count: number;
  missions_completed_count: number;
  proof_count: number;
  report_count: number;
  playbook_count: number;
  robot_connected: boolean;
  pro_interest: boolean;
  activation_score: number;
  likely_to_pay: boolean;
  likely_to_pay_reason: string;
  admin_notes?: string;
  contact_status?: string;
};

export function AdminAnalyticsClient() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [contactStatus, setContactStatus] = useState('new');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/analytics');
    const payload = await res.json();
    setData(payload);
    setLoading(false);
  }

  async function saveNote() {
    if (!selected) return;
    await fetch('/api/admin/analytics', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selected.id, admin_notes: noteDraft, contact_status: contactStatus })
    });
    setSelected({ ...selected, admin_notes: noteDraft, contact_status: contactStatus });
  }

  const users: AdminUser[] = data?.users || [];
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.toLowerCase();
      const matchesQuery = !q || `${u.email} ${u.full_name || ''} ${u.source || ''} ${u.x_handle || ''}`.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (filter === 'new') return Date.now() - new Date(u.created_at).getTime() < 24 * 60 * 60 * 1000;
      if (filter === 'active') return Date.now() - new Date(u.last_active_at || 0).getTime() < 24 * 60 * 60 * 1000;
      if (filter === 'completed_first_day') return u.report_count > 0 && u.proof_count > 0;
      if (filter === 'pro_interest') return u.pro_interest;
      if (filter === 'robot') return u.robot_connected;
      if (filter === 'x') return (u.source || '').toLowerCase().includes('x') || Boolean(u.x_handle);
      if (filter === 'likely') return u.likely_to_pay;
      return true;
    });
  }, [users, filter, query]);
  const selectedTimeline = useMemo(() => {
    if (!selected) return [];
    const events = (data?.recent_events || []) as any[];
    return events
      .filter((e) => e.user_id === selected.id)
      .slice(0, 12)
      .map((e) => `${new Date(e.created_at).toLocaleString()} · ${e.event_type}`);
  }, [data, selected]);

  function exportCsv() {
    const header = 'email,name,source,x_handle,joined,last_active,activation_score,likely_to_pay,plan,proof_count,report_count,notes';
    const rows = filtered.map((u) =>
      [u.email, u.full_name || '', u.source || '', u.x_handle || '', u.created_at, u.last_active_at || '', String(u.activation_score), String(u.likely_to_pay), u.plan, String(u.proof_count), String(u.report_count), (u.admin_notes || '').replace(/,/g, ';')].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taskpilot-admin-users.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary btn-sm" onClick={() => void load()}>{loading ? 'Loading…' : 'Refresh analytics'}</button>
        <button className="btn-secondary btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      {data?.summary && (
        <div className="grid gap-2 md:grid-cols-6">
          {[
            ['Total users', data.summary.total_users],
            ['New users today', data.summary.new_users_24h],
            ['Active 24h', data.summary.active_users_24h],
            ['Completed full loop', data.summary.reports_generated],
            ['Pro interest', data.summary.pro_interest_count],
            ['Likely to pay', data.summary.conversion_ready_users]
          ].map(([k, v]) => (
            <div key={String(k)} className="card p-3">
              <p className="text-xs text-slate-400">{k}</p>
              <p className="text-2xl font-black">{String(v)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="input max-w-sm" placeholder="Search email, name, source, X handle" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="input max-w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="new">New users</option>
            <option value="active">Active users</option>
            <option value="completed_first_day">Completed first day</option>
            <option value="pro_interest">Pro interest</option>
            <option value="robot">Robot users</option>
            <option value="x">X sourced users</option>
            <option value="likely">Likely to pay</option>
          </select>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th>Email</th><th>Source</th><th>Joined</th><th>Last active</th><th>Plan</th><th>Activation</th><th>Daily plans</th><th>Missions done</th><th>Proofs</th><th>Reports</th><th>Playbooks</th><th>Robot</th><th>Pay signal</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td>{u.email}</td>
                  <td>{u.x_handle ? `${u.source || '-'} @${u.x_handle}` : u.source || '-'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>{u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : '-'}</td>
                  <td>{u.plan}</td>
                  <td>{u.activation_score}</td>
                  <td>{u.daily_plans_count}</td>
                  <td>{u.missions_completed_count}</td>
                  <td>{u.proof_count}</td>
                  <td>{u.report_count}</td>
                  <td>{u.playbook_count}</td>
                  <td>{u.robot_connected ? 'Yes' : 'No'}</td>
                  <td>{u.likely_to_pay ? `Yes · ${u.likely_to_pay_reason}` : 'No'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => { setSelected(u); setNoteDraft(u.admin_notes || ''); setContactStatus(u.contact_status || 'new'); }}>Open details</button>
                      <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(u.email)}>Copy email</button>
                      <button className="btn-ghost btn-sm" onClick={() => { setSelected(u); setContactStatus('contacted'); setNoteDraft(u.admin_notes || ''); }}>Mark contacted</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{selected.email}</h2>
            <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
          <p className="text-sm text-slate-400">{selected.full_name || 'No name'} · {selected.source || '-'} {selected.x_handle ? `· @${selected.x_handle}` : ''}</p>
          <p className="text-sm text-slate-400">Joined {new Date(selected.created_at).toLocaleString()} · Last active {selected.last_active_at ? new Date(selected.last_active_at).toLocaleString() : 'unknown'}</p>
          <p className="text-sm text-slate-300 mt-2">Activation {selected.activation_score}/100 · {selected.likely_to_pay ? `Likely to pay: ${selected.likely_to_pay_reason}` : 'No pay signal yet'}</p>
          <div className="mt-2 text-sm text-slate-300">
            <p>Timeline: signup → daily plan {selected.daily_plans_count} → mission start {selected.missions_started_count} → proof {selected.proof_count} → mission complete {selected.missions_completed_count} → day closed {selected.report_count} → playbooks {selected.playbook_count}</p>
            {selectedTimeline.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                {selectedTimeline.map((entry) => <p key={entry}>{entry}</p>)}
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px]">
            <textarea className="input min-h-24" placeholder="Founder notes" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
            <div className="space-y-2">
              <select className="input" value={contactStatus} onChange={(e) => setContactStatus(e.target.value)}>
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="responded">responded</option>
                <option value="converted">converted</option>
              </select>
              <button className="btn-primary btn-sm w-full" onClick={() => void saveNote()}>Save note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
