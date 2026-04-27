'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { sampleWorkflows } from '@/data/sampleWorkflows';
import { deleteGeneratedWorkflow, loadGeneratedWorkflows, saveGeneratedWorkflow } from '@/lib/workflowPersistence';
import { getPinnedWorkflowIds, togglePinnedWorkflow } from '@/lib/pinnedWorkflows';
import { getDailyStorageKey } from '@/lib/storage';
import type { Workflow } from '@/types/workflow';

type Source = 'built-in' | 'generated' | 'supabase' | 'local';

type WorkflowRow = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  steps: number;
  source: Source;
  workflow: Workflow;
  lastUsed: string;
  quality: number;
  sourceCategory: 'starter' | 'generated' | 'user-created' | 'imported' | 'internal/example';
  state: 'active' | 'archived' | 'deleted/local-hidden';
};

function downloadFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toTodayFromWorkflow(workflow: Workflow) {
  const firstStep = workflow.steps.find((step) => step.step_number > 0) || workflow.steps[0];
  if (!firstStep || typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  const key = getDailyStorageKey(today);
  const raw = localStorage.getItem(key);
  const parsed = raw ? JSON.parse(raw) : { date: today, outcomes: [], status: 'planning', events: [], coach_messages: [], last_saved_at: new Date().toISOString() };
  const outcome = {
    id: crypto.randomUUID(),
    title: firstStep.title,
    why_it_matters: workflow.completion_criteria || 'Execute linked playbook step inside Today.',
    category: 'build',
    priority: 1,
    status: 'planned',
    estimated_minutes: firstStep.estimated_minutes || 25,
    actual_minutes: 0,
    proof_required: firstStep.proof_required || 'Screenshot or note proving step completion.',
    proof_provided: '',
    first_action: firstStep.instructions || 'Start this step.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    source_type: 'workflow_step',
    linked_workflow_id: workflow.id,
    linked_step_number: firstStep.step_number,
    linked_step_title: firstStep.title
  };
  const existing = Array.isArray(parsed.outcomes) ? parsed.outcomes : [];
  localStorage.setItem(key, JSON.stringify({
    ...parsed,
    status: parsed.status === 'complete' ? 'planning' : parsed.status,
    outcomes: [outcome, ...existing].slice(0, 8),
    active_outcome_id: parsed.active_outcome_id || outcome.id,
    last_saved_at: new Date().toISOString()
  }));
}

export default function SavedWorkflowsPage() {
  const [generated, setGenerated] = useState<Workflow[]>([]);
  const [supabaseWorkflows, setSupabaseWorkflows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | Source>('all');
  const [sort, setSort] = useState<'recent' | 'newest' | 'steps'>('recent');
  const [pinned, setPinned] = useState<string[]>([]);
  const [archived, setArchived] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [view, setView] = useState<'default' | 'pinned' | 'mine' | 'starter' | 'generated' | 'archived' | 'internal'>('default');

  useEffect(() => {
    setGenerated(loadGeneratedWorkflows());
    setPinned(getPinnedWorkflowIds());
    try {
      setArchived(JSON.parse(localStorage.getItem('taskpilot-workflow-archived') || '[]'));
      setHidden(JSON.parse(localStorage.getItem('taskpilot-workflow-hidden') || '[]'));
    } catch {
      // ignore invalid library metadata
    }
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

  const rows = useMemo<WorkflowRow[]>(() => {
    const builtInRows = sampleWorkflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.workflow_name,
      category: workflow.category,
      difficulty: workflow.difficulty,
      steps: workflow.steps.length,
      source: 'built-in' as const,
      workflow,
      lastUsed: '',
      quality: workflow.generation_quality?.usability_score || 85
      ,
      sourceCategory: (workflow.id.includes('taskpilot-mvp') || workflow.workflow_name.toLowerCase().includes('example') ? 'internal/example' : 'starter') as WorkflowRow['sourceCategory'],
      state: (hidden.includes(workflow.id) ? 'deleted/local-hidden' : archived.includes(workflow.id) ? 'archived' : 'active') as WorkflowRow['state']
    }));
    const generatedRows = generated.map((workflow) => ({
      id: workflow.id,
      name: workflow.workflow_name,
      category: workflow.category,
      difficulty: workflow.difficulty,
      steps: workflow.steps.length,
      source: 'generated' as const,
      workflow,
      lastUsed: '',
      quality: workflow.generation_quality?.estimated_usefulness_score || workflow.generation_quality?.usability_score || 75
      ,
      sourceCategory: 'generated' as WorkflowRow['sourceCategory'],
      state: (hidden.includes(workflow.id) ? 'deleted/local-hidden' : archived.includes(workflow.id) ? 'archived' : 'active') as WorkflowRow['state']
    }));
    const supabaseRows = supabaseWorkflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      category: workflow.category || 'custom',
      difficulty: workflow.difficulty || 'intermediate',
      steps: Array.isArray(workflow.workflow_steps) ? workflow.workflow_steps.length : 0,
      source: 'supabase' as const,
      workflow: {
        id: workflow.slug || workflow.id,
        workflow_name: workflow.name,
        category: workflow.category || 'custom',
        difficulty: workflow.difficulty || 'intermediate',
        estimated_time: workflow.estimated_time || '',
        required_tools: workflow.required_tools || [],
        required_materials: workflow.required_materials || [],
        prerequisites: [],
        steps: workflow.workflow_steps || [],
        completion_criteria: workflow.goal || '',
        report_template: { summary: 'Workflow report', issues_found: [], fixes_made: [], recommendations: [] }
      } as Workflow,
      lastUsed: workflow.updated_at || '',
      quality: 80
      ,
      sourceCategory: 'user-created' as WorkflowRow['sourceCategory'],
      state: (hidden.includes(workflow.id) ? 'deleted/local-hidden' : archived.includes(workflow.id) ? 'archived' : 'active') as WorkflowRow['state']
    }));
    return [...builtInRows, ...generatedRows, ...supabaseRows];
  }, [generated, supabaseWorkflows, archived, hidden]);

  const filtered = rows
    .filter((row) => (sourceFilter === 'all' ? true : row.source === sourceFilter))
    .filter((row) => (view === 'archived' ? row.state === 'archived' : row.state === 'active'))
    .filter((row) => (view === 'pinned' ? pinned.includes(row.workflow.id) : true))
    .filter((row) => (view === 'mine' ? row.sourceCategory === 'generated' || row.sourceCategory === 'user-created' : true))
    .filter((row) => (view === 'starter' ? row.sourceCategory === 'starter' : true))
    .filter((row) => (view === 'generated' ? row.sourceCategory === 'generated' : true))
    .filter((row) => (view === 'internal' ? row.sourceCategory === 'internal/example' : view === 'default' ? row.sourceCategory !== 'internal/example' : true))
    .filter((row) => (category === 'all' ? true : row.category === category))
    .filter((row) => `${row.name} ${row.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinned.includes(a.workflow.id) ? 1 : 0;
      const bPinned = pinned.includes(b.workflow.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      if (sort === 'steps') return b.steps - a.steps;
      if (sort === 'newest') return (b.id > a.id ? 1 : -1);
      return (b.lastUsed || '').localeCompare(a.lastUsed || '');
    });

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Playbook Library</h1>
        <p className="mb-5 text-slate-400">Reusable systems for daily execution, outreach, research, building, and operations.</p>
        <div className="card mb-4 grid gap-2 p-4 md:grid-cols-4">
          <input className="input" placeholder="Search playbooks..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">all categories</option>
            {[...new Set(rows.map((row) => row.category))].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as 'all' | Source)}>
            <option value="all">all sources</option>
            <option value="built-in">built-in</option>
            <option value="generated">generated</option>
            <option value="supabase">supabase</option>
            <option value="local">local</option>
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'newest' | 'steps')}>
            <option value="recent">recently used</option>
            <option value="newest">newest</option>
            <option value="steps">step count</option>
          </select>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setView('default')}>Default</button>
          <button className="btn-ghost btn-sm" onClick={() => setView('pinned')}>Pinned</button>
          <button className="btn-ghost btn-sm" onClick={() => setView('mine')}>Mine</button>
          <button className="btn-ghost btn-sm" onClick={() => setView('starter')}>Starter</button>
          <button className="btn-ghost btn-sm" onClick={() => setView('generated')}>Generated</button>
          <button className="btn-ghost btn-sm" onClick={() => setView('archived')}>Archived</button>
          <button className="btn-ghost btn-sm" onClick={() => setView('internal')}>Internal examples</button>
        </div>
        {rows.length > 10 && (
          <div className="card mb-4 p-4">
            <p className="text-sm text-slate-300">You have {rows.length} playbooks. Want to clean up your library?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setView('pinned')}>Show only pinned</button>
              <button className="btn-secondary btn-sm" onClick={() => {
                const unusedGenerated = rows.filter((row) => row.sourceCategory === 'generated' && !row.lastUsed).map((row) => row.workflow.id);
                const next = Array.from(new Set([...archived, ...unusedGenerated]));
                setArchived(next);
                localStorage.setItem('taskpilot-workflow-archived', JSON.stringify(next));
              }}>Archive unused generated playbooks</button>
              <button className="btn-ghost btn-sm" onClick={() => setView('archived')}>Manage library</button>
            </div>
          </div>
        )}

        {!filtered.length ? (
          <div className="card p-6 text-center text-slate-300">
            <p className="mb-3">Generate your first playbook.</p>
            <Link href="/workflows/generate" className="btn-primary">Open playbook generator</Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <div key={row.id} className="card p-4">
                <p className="font-semibold text-white">{row.name}</p>
                <p className="text-xs text-slate-500">{row.category} · {row.difficulty} · {row.steps} steps</p>
                <p className="text-xs text-slate-500">source: {row.source} · quality: {row.quality}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link className="btn-primary text-xs" href={`/session/${row.workflow.id}`}>Start</Link>
                  <button className="btn-secondary text-xs" onClick={() => { toTodayFromWorkflow(row.workflow); window.location.href = '/daily'; }}>Run in Today</button>
                  <button className="btn-ghost btn-sm" onClick={() => setPinned(togglePinnedWorkflow(row.workflow.id))}>{pinned.includes(row.workflow.id) ? 'Unpin' : 'Pin'}</button>
                  <button className="btn-ghost btn-sm" onClick={() => {
                    const next = Array.from(new Set([...archived, row.workflow.id]));
                    setArchived(next);
                    localStorage.setItem('taskpilot-workflow-archived', JSON.stringify(next));
                  }}>Archive</button>
                  <details>
                    <summary className="btn-ghost btn-sm cursor-pointer">Manage</summary>
                    <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-2">
                      <Link className="btn-ghost btn-sm" href="/workflows/generate">Edit</Link>
                      <button className="btn-ghost btn-sm" onClick={() => setGenerated((prev) => [saveGeneratedWorkflow({ ...row.workflow, id: `${row.workflow.id}-copy-${Date.now()}` })[0], ...prev])}>Duplicate</button>
                      {row.state === 'archived' && <button className="btn-ghost btn-sm" onClick={() => {
                        const next = archived.filter((id) => id !== row.workflow.id);
                        setArchived(next);
                        localStorage.setItem('taskpilot-workflow-archived', JSON.stringify(next));
                      }}>Restore</button>}
                      <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(row.workflow, null, 2))}>Export</button>
                      <button className="btn-ghost btn-sm" onClick={() => {
                        const next = Array.from(new Set([...hidden, row.workflow.id]));
                        setHidden(next);
                        localStorage.setItem('taskpilot-workflow-hidden', JSON.stringify(next));
                        if (row.source === 'generated') setGenerated(deleteGeneratedWorkflow(row.workflow.id));
                      }}>Delete</button>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
