'use client';

type LoopStep = 'plan' | 'focus' | 'prove' | 'reflect' | 'level';

export function DailyLoopProgress({ currentStep }: { currentStep: LoopStep }) {
  const steps: Array<{ id: LoopStep; label: string }> = [
    { id: 'plan', label: 'Plan' },
    { id: 'focus', label: 'Focus' },
    { id: 'prove', label: 'Prove' },
    { id: 'reflect', label: 'Reflect' },
    { id: 'level', label: 'Level Up' }
  ];
  const currentIndex = steps.findIndex((item) => item.id === currentStep);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2">
      {steps.map((step, idx) => {
        const status = idx < currentIndex ? 'complete' : idx === currentIndex ? 'current' : 'upcoming';
        return (
          <div key={step.id} className={`rounded-full border px-2 py-1 text-xs ${status === 'complete' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : status === 'current' ? 'border-amber-400 bg-amber-400/10 text-amber-200' : 'border-slate-700 text-slate-400'}`}>
            <span className="mr-1">{status === 'complete' ? '●' : status === 'current' ? '◉' : '○'}</span>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

