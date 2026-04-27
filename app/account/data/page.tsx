'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { loadGeneratedWorkflows, saveGeneratedWorkflow } from '@/lib/workflowPersistence';

export default function AccountDataPage() {
  const [localDemoFound, setLocalDemoFound] = useState(false);

  useEffect(() => {
    setLocalDemoFound(Object.keys(localStorage).some((key) => key.startsWith('taskpilot-demo-') || key.startsWith('taskpilot-session-')));
  }, []);

  function clearLocalDemoData() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('taskpilot-demo-') || key.startsWith('taskpilot-session-')) localStorage.removeItem(key);
    });
    setLocalDemoFound(false);
  }

  async function importLocalGenerated() {
    const workflows = loadGeneratedWorkflows();
    for (const workflow of workflows) saveGeneratedWorkflow(workflow);
  }

  function exportJson(prefix: string, obj: unknown) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-black">Account Data</h1>
        {localDemoFound && <div className="mb-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">Local demo data found. Import into your account?</div>}
        <div className="card p-5">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={clearLocalDemoData}>Clear local demo data</button>
            <button className="btn-secondary" onClick={() => void importLocalGenerated()}>Import local demo workflows into account</button>
            <button className="btn-secondary" onClick={() => exportJson('my-workflows', loadGeneratedWorkflows())}>Export my workflows JSON</button>
            <button className="btn-secondary" onClick={() => exportJson('my-sessions', Object.keys(localStorage).filter((k) => k.includes('session')).map((k) => ({ key: k, value: localStorage.getItem(k) })))}>Export my sessions JSON</button>
          </div>
        </div>
      </section>
    </main>
  );
}
