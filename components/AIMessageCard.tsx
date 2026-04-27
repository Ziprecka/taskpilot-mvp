import type { AIResponse } from '@/types/workflow';

export function AIMessageCard({
  content,
  messageId,
  sessionId,
  meta,
  onMarkStepComplete
}: {
  content: string;
  messageId?: string;
  sessionId?: string;
  meta?: {
    aiResponse?: Partial<AIResponse>;
  };
  onMarkStepComplete?: () => void;
}) {
  function rate(rating: string) {
    const key = 'taskpilot-ai-message-feedback';
    const item = {
      id: crypto.randomUUID(),
      message_id: messageId || '',
      session_id: sessionId || '',
      rating,
      created_at: new Date().toISOString()
    };
    try {
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([item, ...(Array.isArray(prev) ? prev : [])]));
    } catch {
      localStorage.setItem(key, JSON.stringify([item]));
    }
    void fetch('/api/db/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AI quality issue',
        severity: rating === 'wrong' ? 'high' : 'medium',
        area: 'AI Message',
        description: `Message feedback: ${rating}`,
        expected_behavior: 'Actionable and accurate AI response',
        status: 'open'
      })
    }).catch(() => null);
    void fetch('/api/db/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        session_id: sessionId,
        rating
      })
    }).catch(() => null);
  }
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
          <button className="btn-secondary btn-sm mt-2" onClick={onMarkStepComplete}>Mark this step complete</button>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          <button className="btn-ghost btn-sm text-[11px]" onClick={() => rate('useful')}>Useful</button>
          <button className="btn-ghost btn-sm text-[11px]" onClick={() => rate('not_useful')}>Not useful</button>
          <button className="btn-ghost btn-sm text-[11px]" onClick={() => rate('too_vague')}>Too vague</button>
          <button className="btn-ghost btn-sm text-[11px]" onClick={() => rate('wrong')}>Wrong</button>
          <button className="btn-ghost btn-sm text-[11px]" onClick={() => rate('great_next_action')}>Great next action</button>
        </div>
      </div>
    </div>
  );
}
