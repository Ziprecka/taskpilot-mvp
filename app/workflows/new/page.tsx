'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';

export default function NewWorkflowPage() {
  const router = useRouter();
  const [category, setCategory] = useState('electronics');
  const [goal, setGoal] = useState('');
  const [mode, setMode] = useState('guide');

  function start() {
    const fallback = category === 'coding' ? 'java-gradle-debug' : category === '3d-printing' ? 'first-layer-troubleshoot' : category === 'research' ? 'product-research' : 'arduino-led-blink';
    router.push(`/session/${fallback}?goal=${encodeURIComponent(goal || 'Complete this workflow')}&mode=${mode}`);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="card p-6">
          <p className="badge mb-3">New workflow</p>
          <h1 className="mb-2 text-3xl font-black">What are you trying to complete?</h1>
          <p className="mb-6 text-slate-400">TaskPilot will turn your goal into steps, track state, and push the next action.</p>
          <label className="mb-2 block text-sm font-bold">Goal</label>
          <textarea className="input mb-4 min-h-28" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Example: Help me build an Arduino LED blink project and debug wiring/code issues." />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="electronics">Electronics Assembly</option>
                <option value="coding">Coding / Debugging</option>
                <option value="research">Research</option>
                <option value="3d-printing">3D Printing</option>
                <option value="custom">Custom Workflow</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Mode</label>
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="guide">Guide</option>
                <option value="check">Check my work</option>
                <option value="debug">Debug</option>
                <option value="research">Research</option>
                <option value="train">Train</option>
                <option value="report">Report</option>
              </select>
            </div>
          </div>
          <button onClick={start} className="btn-primary mt-6">Start workflow</button>
          <button onClick={() => router.push('/workflows/generate')} className="btn-secondary mt-2">Generate Custom Workflow</button>
        </div>
      </section>
    </main>
  );
}
