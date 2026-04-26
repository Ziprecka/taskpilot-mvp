'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

const ROBOT_ID = 'deskbot_001';

export default function RobotSettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [output, setOutput] = useState<string>('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    void fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => null);
    void fetch('/api/db/status').then((res) => res.json()).then(setDbStatus).catch(() => null);
  }, []);

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
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-2 text-3xl font-black">Robot API Test Console</h1>
        <p className="mb-5 text-slate-400">Test robot endpoints before hardware integration.</p>

        <div className="card mb-5 p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Robot API Status</h2>
          <p className="text-sm text-slate-300">TASKPILOT_ROBOT_API_KEY detected: {health?.env?.hasRobotApiKey ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">Supabase robot tables installed: {dbStatus?.robot?.tables_installed ? 'yes' : 'no'}</p>
          <p className="text-sm text-slate-300">Current test robot id: {ROBOT_ID}</p>
          {!health?.env?.hasRobotApiKey && <p className="mt-2 text-sm text-amber-300">Add TASKPILOT_ROBOT_API_KEY to .env.local and restart dev server.</p>}
          <input className="input mt-3" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste robot key for local testing..." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-2 font-semibold text-white">Register Test Robot</h3>
            <button
              className="btn-secondary text-sm"
              onClick={() => call('/api/robot/register', 'POST', {
                robot_id: ROBOT_ID,
                name: 'TaskPilot DeskBot',
                device_type: 'raspberry_pi',
                capabilities: { speaker: true, microphone: true, camera: true, screen: true, movement: false, leds: true }
              })}
            >
              Register deskbot_001
            </button>
          </div>
          <div className="card p-5">
            <h3 className="mb-2 font-semibold text-white">Get Robot State</h3>
            <button className="btn-secondary text-sm" onClick={() => call(`/api/robot/state?robot_id=${ROBOT_ID}`, 'GET')}>Fetch State</button>
          </div>
          <div className="card p-5">
            <h3 className="mb-2 font-semibold text-white">Send Robot Event</h3>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary text-xs" onClick={() => call('/api/robot/heartbeat', 'POST', { robot_id: ROBOT_ID, battery: 92, status: 'idle' })}>Heartbeat</button>
              <button className="btn-secondary text-xs" onClick={() => call('/api/robot/event', 'POST', { robot_id: ROBOT_ID, event_type: 'button_pressed', content: 'User pressed check-in button.', metadata: {} })}>Button Pressed</button>
              <button className="btn-secondary text-xs" onClick={() => call('/api/robot/event', 'POST', { robot_id: ROBOT_ID, event_type: 'checkin_due', content: 'Check-in due.', metadata: {} })}>Check-in Due</button>
              <button className="btn-secondary text-xs" onClick={() => call('/api/robot/event', 'POST', { robot_id: ROBOT_ID, event_type: 'voice_command', content: 'What next?', metadata: {} })}>Voice: What next?</button>
            </div>
          </div>
          <div className="card p-5">
            <h3 className="mb-2 font-semibold text-white">Pending Command</h3>
            <button className="btn-secondary text-sm" onClick={() => call(`/api/robot/command?robot_id=${ROBOT_ID}`, 'GET')}>Fetch Pending Command</button>
          </div>
        </div>

        <div className="card mt-5 p-5">
          <h3 className="mb-2 font-semibold text-white">Robot API curl example</h3>
          <pre className="overflow-x-auto rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">{`curl -X POST http://localhost:3000/api/robot/register \\
  -H "Content-Type: application/json" \\
  -H "x-taskpilot-robot-key: YOUR_KEY" \\
  -d "{\\"robot_id\\":\\"deskbot_001\\",\\"name\\":\\"TaskPilot DeskBot\\",\\"device_type\\":\\"raspberry_pi\\",\\"capabilities\\":{\\"speaker\\":true,\\"microphone\\":true,\\"camera\\":true,\\"screen\\":true,\\"movement\\":false,\\"leds\\":true}}"`}</pre>
        </div>

        <div className="card mt-5 p-5">
          <h3 className="mb-2 font-semibold text-white">Output</h3>
          <pre className="overflow-x-auto rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">{output || 'No output yet.'}</pre>
        </div>
      </section>
    </main>
  );
}
