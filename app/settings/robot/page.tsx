'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import {
  DEFAULT_ROBOT_ID,
  ROBOT_API_KEY_LS,
  ROBOT_ID_LS,
  secondsAgoLabel
} from '@/lib/robotClientSettings';

type RobotMeta = {
  last_heartbeat_at?: string | null;
  heartbeat_count?: number;
  online?: boolean;
  button_event_count?: number;
  last_event_type?: string | null;
  last_event_at?: string | null;
};

type RobotStateView = {
  status?: string;
  current_task?: string;
  mission?: string;
  next_move?: string;
  proof_needed?: string;
  source?: string;
  owner_user_id?: string | null;
  last_updated?: string;
  short_message?: string;
};

export default function RobotSettingsPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [dbStatus, setDbStatus] = useState<Record<string, unknown> | null>(null);
  const [output, setOutput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [robotId, setRobotId] = useState(DEFAULT_ROBOT_ID);
  const [baseUrl, setBaseUrl] = useState('https://taskpilot.live');
  const [stateResp, setStateResp] = useState<{ state?: RobotStateView; meta?: RobotMeta; warning?: string | null } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
    void fetch('/api/db/status').then((res) => res.json()).then(setDbStatus).catch(() => null);
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
      setApiKey(localStorage.getItem(ROBOT_API_KEY_LS) || '');
      setRobotId(localStorage.getItem(ROBOT_ID_LS) || DEFAULT_ROBOT_ID);
    }
  }, []);

  function persistKeys() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ROBOT_API_KEY_LS, apiKey.trim());
    localStorage.setItem(ROBOT_ID_LS, robotId.trim() || DEFAULT_ROBOT_ID);
  }

  const fetchStatePreview = useCallback(async () => {
    if (!apiKey.trim()) return;
    const res = await fetch(`/api/robot/state?robot_id=${encodeURIComponent(robotId.trim() || DEFAULT_ROBOT_ID)}`, {
      headers: { 'x-taskpilot-robot-key': apiKey.trim() }
    });
    const data = await res.json() as { ok?: boolean; state?: RobotStateView; meta?: RobotMeta; warning?: string | null };
    setStateResp(data.ok ? { state: data.state, meta: data.meta, warning: data.warning } : null);
    setOutput(JSON.stringify(data, null, 2));
  }, [apiKey, robotId]);

  useEffect(() => {
    const clock = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!apiKey.trim()) return;
    const id = window.setInterval(() => void fetchStatePreview(), 6000);
    void fetchStatePreview();
    return () => clearInterval(id);
  }, [apiKey, fetchStatePreview]);

  async function call(path: string, method: string, body?: unknown) {
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-taskpilot-robot-key': apiKey
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    setOutput(JSON.stringify(data, null, 2));
    return data;
  }

  const rid = robotId.trim() || DEFAULT_ROBOT_ID;
  const meta = stateResp?.meta;
  const rstate = stateResp?.state;

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="badge mb-2">DeskBot</div>
        <h1 className="mb-2 text-3xl font-black">Atom S3R DeskBot</h1>
        <p className="mb-6 max-w-2xl text-sm text-slate-400">
          The Atom S3R is a physical display for your current TaskPilot mission.
        </p>

        <div className="card mb-5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Connection</h2>
          <label className="text-xs text-slate-500">TASKPILOT_ROBOT_API_KEY (same value as server env)</label>
          <input
            className="input mt-1"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste robot API key…"
          />
          <label className="mt-3 block text-xs text-slate-500">Robot ID</label>
          <input className="input mt-1" value={robotId} onChange={(e) => setRobotId(e.target.value)} placeholder={DEFAULT_ROBOT_ID} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={persistKeys}>
              Save to this browser
            </button>
            <Link href="/daily" className="btn-secondary btn-sm">
              Open Daily
            </Link>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Env check: KEY configured on server — {(health as { hasRobotApiKey?: boolean })?.hasRobotApiKey ? 'yes' : 'no'} · Supabase robot tables —{' '}
            {dbStatus?.robot && (dbStatus.robot as { tables_installed?: boolean }).tables_installed ? 'yes' : 'no'}
          </p>
        </div>

        <div className="card mb-5 border-amber-500/25 bg-slate-950/60 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-400/90">DeskBot live</h2>
          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>
              <span className="text-slate-500">Connection:</span>{' '}
              <span className={meta?.online ? 'text-emerald-400' : 'text-slate-400'}>{meta?.online ? 'Online' : 'Offline'}</span>
            </p>
            <p>
              <span className="text-slate-500">Last heartbeat:</span> {secondsAgoLabel(meta?.last_heartbeat_at)}
            </p>
            <p>
              <span className="text-slate-500">Status:</span> {String(rstate?.status ?? '—')}
            </p>
            <p>
              <span className="text-slate-500">Current task:</span> {String(rstate?.current_task ?? '—')}
            </p>
            <p className="md:col-span-2">
              <span className="text-slate-500">Current mission:</span> {String(rstate?.mission ?? '—')}
            </p>
            <p className="md:col-span-2">
              <span className="text-slate-500">Next move:</span> {String(rstate?.next_move ?? '—')}
            </p>
            <p className="md:col-span-2">
              <span className="text-slate-500">Proof:</span> {String(rstate?.proof_needed ?? '—')}
            </p>
            <p>
              <span className="text-slate-500">Last event:</span> {meta?.last_event_type ?? '—'} · {secondsAgoLabel(meta?.last_event_at)}
            </p>
            <p>
              <span className="text-slate-500">Heartbeat count:</span> {meta?.heartbeat_count ?? 0}{' '}
              <span className="sr-only">{tick}</span>
            </p>
            <p>
              <span className="text-slate-500">Button events:</span> {meta?.button_event_count ?? 0}
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Robot instruction: <span className="text-slate-300">{String(rstate?.short_message ?? '—')}</span>
          </p>
        </div>

        <div className="card mb-5 p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Live State Sent to Atom</h2>
            <button type="button" className="btn-secondary btn-sm" onClick={() => void fetchStatePreview()}>
              Refresh state
            </button>
          </div>
          <p className="text-xs text-slate-400">Owner user_id: {rstate?.owner_user_id || 'unknown'}</p>
          <p className="text-xs text-slate-400">Source: {rstate?.source || 'fallback'}</p>
          <p className="text-xs text-slate-400">Last updated: {rstate?.last_updated || '—'}</p>
          {rstate?.source === 'fallback' && (
            <p className="mt-2 text-xs text-amber-300">Warning: source is fallback. Robot may show No mission yet.</p>
          )}
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">
            {JSON.stringify(stateResp || {}, null, 2)}
          </pre>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-2 font-semibold text-white">Robot controls</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => call('/api/robot/heartbeat', 'POST', { robot_id: rid, status: 'idle' })}>
                Send test command
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => void fetchStatePreview()}>
                Fetch state
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => call('/api/robot/event', 'POST', { robot_id: rid, event_type: 'button_pressed', content: 'Simulated check-in', metadata: {} })}
              >
                Simulate check-in
              </button>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="mb-2 font-semibold text-white">Simulate Atom</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => call('/api/robot/event', 'POST', { robot_id: rid, event_type: 'long_press', content: 'Simulated', metadata: {} })}
              >
                Simulate blocked
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => call('/api/robot/event', 'POST', { robot_id: rid, event_type: 'proof_request', content: 'Simulated', metadata: {} })}
              >
                Simulate proof request
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={async () => {
                  if (!apiKey.trim()) return;
                  const res = await fetch(`/api/robot/command?robot_id=${encodeURIComponent(rid)}`, {
                    headers: { 'x-taskpilot-robot-key': apiKey.trim() }
                  });
                  const data = await res.json();
                  setOutput(JSON.stringify(data, null, 2));
                }}
              >
                Pending command
              </button>
            </div>
          </div>
        </div>

        <div className="card mt-5 p-5">
          <h3 className="mb-2 font-semibold text-white">Queue commands (Serial / firmware)</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'speak', message: 'DeskBot speak test.' })}>
              speak
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'show_status' })}>
              show_status
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'show_mission' })}>
              show_mission
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'show_next' })}>
              show_next
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'show_proof' })}>
              show_proof
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'request_proof' })}>
              request_proof
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'blocked_prompt' })}>
              blocked_prompt
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'check_in' })}>
              check_in
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'blocked' })}>
              blocked
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => call('/api/robot/command', 'POST', { robot_id: rid, type: 'daily_briefing' })}>
              daily_briefing
            </button>
          </div>
        </div>

        <div className="card mt-5 p-5">
          <h3 className="mb-2 font-semibold text-white">curl · GET state</h3>
          <pre className="overflow-x-auto rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">{`curl -s "${baseUrl}/api/robot/state?robot_id=${rid}" \\
  -H "x-taskpilot-robot-key: YOUR_KEY"`}</pre>
        </div>

        <div className="card mt-5 p-5">
          <h3 className="mb-2 font-semibold text-white">Last response</h3>
          <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">{output || 'No output yet.'}</pre>
        </div>
      </section>
    </main>
  );
}
