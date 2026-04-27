import Link from 'next/link';
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
      <Link className="btn-secondary inline-flex" href={`/session/${workflow.id}`}>Open workflow</Link>
    </div>
  );
}
