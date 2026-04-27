'use client';

import type { DailyAIResponse } from '@/types/workflow';

export function DailyCoachCard(props: {
  ai?: DailyAIResponse;
  onAction: (action: 'start_focus' | 'log_proof' | 'mark_done' | 'create_workflow' | 'close_day' | 'none') => void;
}) {
  const ai = props.ai;
  if (!ai) return <p className="text-sm text-slate-500">No recommendation yet.</p>;
  const steps = (ai.steps || [ai.next_action]).slice(0, 3);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm">
      <p className="text-xs uppercase tracking-wider text-slate-500">Best Next Move</p>
      <p className="text-lg font-semibold text-white">{ai.headline || ai.next_action}</p>
      <p className="mt-2"><span className="text-slate-500">Do now:</span> {ai.do_now || ai.next_action}</p>
      <div className="mt-2">
        {steps.map((step, idx) => <p key={`${step}-${idx}`} className="text-slate-300">- {step}</p>)}
      </div>
      <p className="mt-2"><span className="text-slate-500">Proof:</span> {ai.proof_needed}</p>
      <p><span className="text-slate-500">Why:</span> {ai.why_it_matters || ai.priority_reason}</p>
      <p><span className="text-slate-500">Avoid:</span> {ai.avoid || ai.drift_warning || 'Over-planning before action.'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(ai.action_buttons || []).map((btn, idx) => (
          <button key={`${btn.label}-${idx}`} className="btn-ghost btn-sm" onClick={() => props.onAction(btn.action)}>{btn.label}</button>
        ))}
      </div>
    </div>
  );
}

