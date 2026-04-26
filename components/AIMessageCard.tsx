import type { AIResponse } from '@/types/workflow';

export function AIMessageCard({
  content,
  meta,
  onMarkStepComplete
}: {
  content: string;
  meta?: {
    aiResponse?: Partial<AIResponse>;
  };
  onMarkStepComplete?: () => void;
}) {
  const ai = meta?.aiResponse;
  if (!ai) {
    return <p className="whitespace-pre-wrap text-sm text-slate-100">{content}</p>;
  }
  const directAnswer = ai.direct_answer || ai.user_facing_response || content;
  return (
    <div className="space-y-2">
      <p className={`whitespace-pre-wrap text-sm ${ai.intent === 'question_answer' ? 'font-semibold text-white' : 'text-slate-100'}`}>{directAnswer}</p>
      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2 text-xs">
        <p><span className="text-slate-400">Next action:</span> <span className={ai.intent === 'next_step' ? 'font-semibold text-amber-200' : ''}>{ai.next_action || 'n/a'}</span></p>
        <p><span className="text-slate-400">Confidence:</span> {ai.workflow_state?.confidence || 'medium'}</p>
        <p><span className="text-slate-400">Issues:</span> {ai.detected_issues?.length ? ai.detected_issues.join(', ') : 'None'}</p>
        {!!ai.proof_result?.proof_summary && <p><span className="text-slate-400">Proof:</span> {ai.proof_result.proof_summary}</p>}
        {ai.intent === 'debug' && ai.needs_input && ai.requested_input && <p><span className="text-slate-400">Needed for debug:</span> {ai.requested_input}</p>}
        {ai.proof_result?.should_mark_complete && (
          <button className="btn-secondary mt-2 text-xs" onClick={onMarkStepComplete}>Mark this step complete</button>
        )}
      </div>
    </div>
  );
}
