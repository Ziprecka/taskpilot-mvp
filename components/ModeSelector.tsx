import type { WorkflowMode } from '@/types/workflow';

const modes: Array<{ id: WorkflowMode; label: string }> = [
  { id: 'guided', label: 'Guided Mode' },
  { id: 'fast_checklist', label: 'Fast Checklist' },
  { id: 'debug', label: 'Debug Mode' },
  { id: 'proof', label: 'Proof Mode' },
  { id: 'robot', label: 'Robot Mode' }
];

export function ModeSelector({ value, onChange }: { value: WorkflowMode; onChange: (mode: WorkflowMode) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((mode) => (
        <button key={mode.id} onClick={() => onChange(mode.id)} className={`rounded-full px-3 py-2 text-xs font-bold ${value === mode.id ? 'bg-amber-400 text-slate-950' : 'border border-slate-700 bg-slate-950/40 text-slate-300'}`}>
          {mode.label}
        </button>
      ))}
    </div>
  );
}
