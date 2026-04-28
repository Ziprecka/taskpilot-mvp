'use client';

import type { DailyOutcome } from '@/types/workflow';

type Props = {
  outcome: DailyOutcome;
  onStart?: () => void;
  onEdit?: () => void;
  onPlaybook?: () => void;
};

export function MissionCard({ outcome, onStart, onEdit, onPlaybook }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">#{outcome.priority} {outcome.title}</p>
        {!!outcome.leverage_score && <span className="badge">Leverage {outcome.leverage_score}</span>}
      </div>
      <p className="text-xs text-slate-500">Proof: {outcome.proof_required}</p>
      <div className="mt-2 flex gap-2">
        {!!onStart && <button className="btn-primary btn-sm" onClick={onStart}>Start</button>}
        {!!onEdit && <button className="btn-ghost btn-sm" onClick={onEdit}>Edit</button>}
        {!!onPlaybook && <button className="btn-ghost btn-sm" onClick={onPlaybook}>Create Playbook</button>}
      </div>
    </div>
  );
}
