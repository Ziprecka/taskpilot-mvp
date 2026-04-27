import Link from 'next/link';
import { getDailyStorageKey } from '@/lib/storage';
import type { Workflow } from '@/types/workflow';

export function WorkflowCard({
  workflow,
  pinned,
  onTogglePin
}: {
  workflow: Workflow;
  pinned?: boolean;
  onTogglePin?: (id: string) => void;
}) {
  function runInToday() {
    if (typeof window === 'undefined') return;
    const firstStep = workflow.steps.find((step) => step.step_number > 0) || workflow.steps[0];
    if (!firstStep) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = getDailyStorageKey(today);
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { date: today, outcomes: [], status: 'planning', events: [], coach_messages: [], last_saved_at: new Date().toISOString() };
    const outcome = {
      id: crypto.randomUUID(),
      title: firstStep.title,
      why_it_matters: workflow.completion_criteria || 'Execute playbook step in Today.',
      category: 'build',
      priority: 1,
      status: 'planned',
      estimated_minutes: firstStep.estimated_minutes || 25,
      actual_minutes: 0,
      proof_required: firstStep.proof_required || 'Screenshot or note proving completion.',
      proof_provided: '',
      first_action: firstStep.instructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      source_type: 'workflow_step',
      linked_workflow_id: workflow.id,
      linked_step_number: firstStep.step_number,
      linked_step_title: firstStep.title
    };
    const existing = Array.isArray(parsed.outcomes) ? parsed.outcomes : [];
    localStorage.setItem(key, JSON.stringify({ ...parsed, outcomes: [outcome, ...existing].slice(0, 8), last_saved_at: new Date().toISOString() }));
    window.location.href = '/daily';
  }
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-white">{workflow.workflow_name}</h3>
        <div className="flex items-center gap-2">
          <span className="badge">{workflow.category}</span>
          {onTogglePin && (
            <button className="btn-ghost btn-sm" onClick={() => onTogglePin(workflow.id)}>
              {pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-400">{workflow.steps.length} steps · {workflow.estimated_time} · {workflow.difficulty}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {workflow.required_tools.slice(0, 3).map((tool) => <span key={tool} className="badge">{tool}</span>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="btn-primary inline-flex" href={`/session/${workflow.id}`}>Start</Link>
        <button className="btn-secondary btn-sm" onClick={runInToday}>Run in Today</button>
      </div>
    </div>
  );
}
