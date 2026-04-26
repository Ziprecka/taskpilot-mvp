import type { WorkflowStep } from '@/types/workflow';

export function CurrentStepCard({
  step,
  onComplete,
  nextAction,
  status,
  syncStatus,
  lastSavedAt,
  onBlocked,
  onAskExplain,
  onAskDebug
}: {
  step: WorkflowStep;
  onComplete: () => void;
  nextAction?: string;
  status: 'active' | 'blocked' | 'complete';
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  lastSavedAt: string;
  onBlocked: () => void;
  onAskExplain: () => void;
  onAskDebug: () => void;
}) {
  return (
    <div className="card p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="badge">Step {step.step_number}</span>
        <span className="badge">Expected: {step.completion_criteria}</span>
      </div>
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Status: {status}</p>
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Sync: {syncStatus} · Last saved: {new Date(lastSavedAt).toLocaleTimeString()}</p>
      <h1 className="mb-3 text-2xl font-black text-white">{step.title}</h1>
      <p className="mb-5 text-slate-300">{step.instructions}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-200">Expected state</h3>
          <p className="text-sm text-slate-400">{step.expected_state}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-200">Common mistakes</h3>
          <ul className="space-y-1 text-sm text-slate-400">
            {step.common_mistakes.map((mistake) => <li key={mistake}>• {mistake}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <h3 className="mb-2 text-sm font-bold text-amber-200">AI next action</h3>
        <p className="text-sm text-amber-100">{nextAction || 'Ask TaskPilot "what next" to generate the next action.'}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={onComplete} className="btn-primary">Mark step complete</button>
        <button onClick={onBlocked} className="btn-secondary">I'm blocked</button>
        <button onClick={onAskExplain} className="btn-secondary">Ask AI to explain</button>
        <button onClick={onAskDebug} className="btn-secondary">Ask AI to debug</button>
      </div>
    </div>
  );
}
