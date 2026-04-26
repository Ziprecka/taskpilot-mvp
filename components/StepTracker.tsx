import type { WorkflowStep } from '@/types/workflow';

export function StepTracker({ steps, currentStep, completedSteps }: { steps: WorkflowStep[]; currentStep: number; completedSteps: number[] }) {
  return (
    <div className="card max-h-[calc(100vh-220px)] overflow-y-auto p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Step Tracker</h2>
      <div className="space-y-3">
        {steps.map((step) => {
          const done = completedSteps.includes(step.step_number);
          const active = currentStep === step.step_number;
          return (
            <div key={step.step_number} className={`rounded-xl border p-3 ${active ? 'border-amber-400 bg-amber-400/10' : done ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-slate-700 bg-slate-950/40'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-400 text-slate-950' : active ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{done ? '✓' : step.step_number}</div>
                <div>
                  <p className="text-sm font-bold text-white">{step.title}</p>
                  <p className="text-xs text-slate-400">{active ? 'Active now' : done ? 'Complete' : 'Waiting'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
