'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';
import { sampleWorkflows } from '@/data/sampleWorkflows';
import { deleteGeneratedWorkflow, loadGeneratedWorkflows, saveGeneratedWorkflow } from '@/lib/workflowPersistence';
import type { Workflow } from '@/types/workflow';

export default function SavedWorkflowsPage() {
  const [generated, setGenerated] = useState<Workflow[]>([]);
  const [supabaseWorkflows, setSupabaseWorkflows] = useState<any[]>([]);

  useEffect(() => {
    setGenerated(loadGeneratedWorkflows());
    void fetch('/api/health')
      .then((res) => res.json())
      .then((health) => {
        if (!health?.env?.supabaseEnabled) return;
        return fetch('/api/db/workflows')
          .then((res) => res.json())
          .then((payload) => setSupabaseWorkflows(payload?.ok ? payload.data : []));
      })
      .catch(() => null);
  }, []);

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-2 text-3xl font-black">Saved Workflows</h1>
        <p className="mb-5 text-slate-400">Built-in, generated, and Supabase workflows in one place.</p>
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Built-in</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sampleWorkflows.map((workflow) => (
              <div key={workflow.id} className="card p-4">
                <p className="font-semibold text-white">{workflow.workflow_name}</p>
                <p className="text-xs text-slate-500">{workflow.category} · {workflow.difficulty} · {workflow.steps.length} steps · source: built-in</p>
                <div className="mt-2 flex gap-2">
                  <Link className="btn-secondary text-xs" href={`/session/${workflow.id}`}>Start</Link>
                  <button className="btn-secondary text-xs" onClick={() => setGenerated((prev) => [saveGeneratedWorkflow(workflow)[0], ...prev])}>Duplicate</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Generated (Local)</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {generated.map((workflow) => (
              <div key={workflow.id} className="card p-4">
                <p className="font-semibold text-white">{workflow.workflow_name}</p>
                <p className="text-xs text-slate-500">{workflow.category} · {workflow.difficulty} · {workflow.steps.length} steps · source: generated</p>
                <div className="mt-2 flex gap-2">
                  <Link className="btn-secondary text-xs" href={`/session/${workflow.id}`}>Start</Link>
                  <Link className="btn-secondary text-xs" href="/workflows/generate">Edit</Link>
                  <button className="btn-secondary text-xs" onClick={() => setGenerated((prev) => [saveGeneratedWorkflow({ ...workflow, id: `${workflow.id}-copy-${Date.now()}` })[0], ...prev])}>Duplicate</button>
                  <button className="btn-secondary text-xs" onClick={() => setGenerated(deleteGeneratedWorkflow(workflow.id))}>Delete local</button>
                </div>
              </div>
            ))}
            {!generated.length && <p className="text-sm text-slate-500">No generated workflows yet.</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Supabase</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {supabaseWorkflows.map((workflow) => (
              <div key={workflow.id} className="card p-4">
                <p className="font-semibold text-white">{workflow.name}</p>
                <p className="text-xs text-slate-500">{workflow.category} · {workflow.difficulty} · source: supabase</p>
                <Link className="btn-secondary mt-2 inline-flex text-xs" href={`/session/${workflow.slug || 'taskpilot-mvp-build'}`}>Start</Link>
              </div>
            ))}
            {!supabaseWorkflows.length && <p className="text-sm text-slate-500">No Supabase workflows loaded.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
