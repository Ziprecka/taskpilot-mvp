import type { WorkflowMode } from '@/types/workflow';

const modes: WorkflowMode[] = ['guide', 'check', 'debug', 'research', 'train', 'report'];

export function ModeSelector({ value, onChange }: { value: WorkflowMode; onChange: (mode: WorkflowMode) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((mode) => (
        <button key={mode} onClick={() => onChange(mode)} className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${value === mode ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 bg-slate-950/40 text-slate-300'}`}>
          {mode}
        </button>
      ))}
    </div>
  );
}
