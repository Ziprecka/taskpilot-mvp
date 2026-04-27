'use client';

import type { DailyAIResponse } from '@/types/workflow';

export function DailyCoachCard(props: {
  ai?: DailyAIResponse;
  onAction: (action: 'start_focus' | 'log_proof' | 'mark_done' | 'create_workflow' | 'close_day' | 'none' | 'ask_clarifying_question') => void;
}) {
  const ai = props.ai;
  if (!ai) return <p className="text-sm text-slate-500">No recommendation yet.</p>;
  const fallbackMove = ai.next_move || ai.do_now || ai.next_action;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-slate-950/70 p-4 text-sm leading-6">
      <p className="text-xs uppercase tracking-widest text-amber-200">Next Move</p>
      <p className="text-base font-semibold text-white">{fallbackMove}</p>
      <p className="mt-2"><span className="text-slate-400">Go here:</span> <span className="text-slate-200">{ai.go_here || 'Open the active outcome card in Daily.'}</span></p>
      <p><span className="text-slate-400">Write / Make / Do:</span> <span className="text-slate-200">{ai.write_make_do || ai.do_now || ai.next_action}</span></p>
      <p><span className="text-slate-400">Proof:</span> <span className="text-slate-200">{ai.proof_needed}</span></p>
      <p><span className="text-slate-400">Timebox:</span> <span className="text-slate-200">{ai.timebox_minutes || ai.focus_minutes || ai.suggested_focus_minutes || 5}m</span></p>
      <p><span className="text-slate-400">Avoid:</span> <span className="text-slate-200">{ai.avoid || ai.drift_warning || 'Over-planning before action.'}</span></p>
      {!!ai.clarifying_question && (
        <p className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-amber-100">{ai.clarifying_question}</p>
      )}
      {ai.suggested_action && ai.suggested_action !== 'none' && ai.suggested_action !== 'ask_clarifying_question' && (
        <div className="mt-3">
          <button className="btn-secondary btn-sm" onClick={() => props.onAction(ai.suggested_action!)}>Run suggested action</button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {(ai.action_buttons || []).slice(0, 1).map((btn, idx) => (
          <button key={`${btn.label}-${idx}`} className="btn-ghost btn-sm" onClick={() => props.onAction(btn.action)}>{btn.label}</button>
        ))}
      </div>
    </div>
  );
}

