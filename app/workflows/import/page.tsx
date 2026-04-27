'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { saveGeneratedWorkflow } from '@/lib/workflowPersistence';

export default function ImportWorkflowPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [workflow, setWorkflow] = useState<any>(null);

  function validateAndPreview() {
    setError('');
    try {
      const parsed = JSON.parse(input);
      if (!parsed.workflow_name) throw new Error('Missing workflow_name');
      if (!Array.isArray(parsed.steps) || !parsed.steps.length) throw new Error('Missing steps');
      for (const step of parsed.steps) {
        if (!step.title) throw new Error('Each step needs title');
        if (!step.instructions) throw new Error('Each step needs instructions');
      }
      parsed.id = parsed.id || parsed.slug || parsed.workflow_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      setWorkflow(parsed);
    } catch (e) {
      setWorkflow(null);
      setError(e instanceof Error ? e.message : 'Invalid workflow JSON');
    }
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Import Workflow</h1>
        <p className="mb-4 text-slate-400">Paste workflow JSON, validate fields, then save and start.</p>
        <div className="card p-4">
          <textarea className="input min-h-56" value={input} onChange={(e) => setInput(e.target.value)} placeholder='Paste workflow JSON...' />
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={validateAndPreview}>Validate</button>
            <Link href="/workflows/saved" className="btn-secondary">Back to library</Link>
          </div>
          {error && <p className="mt-2 text-sm text-amber-300">Invalid: {error}</p>}
        </div>
        {workflow && (
          <div className="card mt-4 p-4">
            <p className="font-semibold text-white">{workflow.workflow_name}</p>
            <p className="text-sm text-slate-400">{workflow.steps.length} steps</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary" onClick={() => saveGeneratedWorkflow(workflow)}>Save</button>
              <button className="btn-primary" onClick={() => { saveGeneratedWorkflow(workflow); router.push(`/session/${workflow.id}`); }}>Save and Start</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
