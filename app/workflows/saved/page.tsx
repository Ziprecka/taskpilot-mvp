'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { sampleWorkflows } from '@/data/sampleWorkflows';
import { deleteGeneratedWorkflow, loadGeneratedWorkflows, saveGeneratedWorkflow } from '@/lib/workflowPersistence';
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

export default function SavedWorkflowsPage() {
  const [generated, setGenerated] = useState<Workflow[]>([]);
  const [supabaseWorkflows, setSupabaseWorkflows] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | Source>('all');
  const [sort, setSort] = useState<'recent' | 'newest' | 'steps'>('recent');

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
    }));
    return [...builtInRows, ...generatedRows, ...supabaseRows];
  }, [generated, supabaseWorkflows]);

  const filtered = rows
    .filter((row) => (sourceFilter === 'all' ? true : row.source === sourceFilter))
    .filter((row) => (category === 'all' ? true : row.category === category))
    .filter((row) => `${row.name} ${row.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'steps') return b.steps - a.steps;
      if (sort === 'newest') return (b.id > a.id ? 1 : -1);
      return (b.lastUsed || '').localeCompare(a.lastUsed || '');
    });

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Workflow Library</h1>
        <p className="mb-5 text-slate-400">Search, filter, run, export, and duplicate workflows.</p>
        <div className="card mb-4 grid gap-2 p-4 md:grid-cols-4">
          <input className="input" placeholder="Search workflows..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

        {!filtered.length ? (
          <div className="card p-6 text-center text-slate-300">
            <p className="mb-3">Generate your first workflow.</p>
            <Link href="/workflows/generate" className="btn-primary">Open workflow generator</Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <div key={row.id} className="card p-4">
                <p className="font-semibold text-white">{row.name}</p>
                <p className="text-xs text-slate-500">{row.category} · {row.difficulty} · {row.steps} steps</p>
                <p className="text-xs text-slate-500">source: {row.source} · quality: {row.quality}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link className="btn-secondary text-xs" href={`/session/${row.workflow.id}`}>Start</Link>
                  <Link className="btn-secondary text-xs" href="/workflows/generate">Edit</Link>
                  <button className="btn-secondary text-xs" onClick={() => setGenerated((prev) => [saveGeneratedWorkflow({ ...row.workflow, id: `${row.workflow.id}-copy-${Date.now()}` })[0], ...prev])}>Duplicate</button>
                  <button className="btn-secondary text-xs" onClick={() => { if (row.source === 'generated') setGenerated(deleteGeneratedWorkflow(row.workflow.id)); }}>Delete</button>
                  <button className="btn-secondary text-xs" onClick={() => navigator.clipboard.writeText(JSON.stringify(row.workflow, null, 2))}>Copy JSON</button>
                  <button className="btn-secondary text-xs" onClick={() => downloadFile(`${row.workflow.id}.json`, JSON.stringify(row.workflow, null, 2), 'application/json')}>Download JSON</button>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => downloadFile(`${row.workflow.id}.md`, `# ${row.workflow.workflow_name}\n\n## Goal\n${row.workflow.completion_criteria}\n\n## Tools\n${row.workflow.required_tools.join(', ')}\n\n## Steps\n${row.workflow.steps.map((s) => `### ${s.step_number}. ${s.title}\n- Instructions: ${s.instructions}\n- Expected: ${s.expected_state}\n- Proof: ${s.proof_required || 'n/a'}\n- Common mistakes: ${(s.common_mistakes || []).join(', ') || 'none'}\n- Completion: ${s.completion_criteria}`).join('\n\n')}`, 'text/markdown')}
                  >
                    Download SOP
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
