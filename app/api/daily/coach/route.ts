import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import type { DailyAIResponse } from '@/types/workflow';

function limitWords(input: string, maxWords: number) {
  return input.split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ').trim();
}

function toNextMoveShape(input: DailyAIResponse): DailyAIResponse {
  return {
    ...input,
    next_move: limitWords(input.next_move || input.do_now || input.next_action || 'Start one concrete action now.', 10),
    go_here: limitWords(input.go_here || 'Open Daily outcome card now.', 12),
    write_make_do: limitWords(input.write_make_do || input.do_now || input.next_action || '', 20),
    proof_needed: limitWords(input.proof_needed || 'Upload screenshot or note as proof.', 14),
    avoid: limitWords(input.avoid || input.drift_warning || 'Avoid context switching before proof.', 14),
    suggested_action: input.suggested_action || 'start_focus',
    clarifying_question: input.clarifying_question || '',
    confidence: input.confidence || 'medium'
  };
}

function sanitizeOutcome(input: string) {
  const text = input.trim();
  const lower = text.toLowerCase();
  if (!text) return 'Define one concrete daily outcome with proof.';
  if (lower.includes('antigravity') || lower.includes('time machine') || lower.includes('teleport')) {
    return 'Research feasibility of the idea and produce a notes doc with 3 credible sources and 3 open questions.';
  }
  if (text.length < 12 || /improve productivity|work on project|research more|finalize mvp|develop core modules/i.test(text)) {
    return 'Rewrite as one-day scoped result with visible proof and a first action.';
  }
  return text;
}

function ensureScopedOutcomes(outcomes: string[]) {
  return outcomes.slice(0, 3).map((item) => sanitizeOutcome(item));
}

function mockDailyResponse(message: string, body: any): DailyAIResponse & { generated_outcomes?: string[] } {
  const outcomes = Array.isArray(body?.outcomes) ? body.outcomes : [];
  const focus = body?.focus;
  const lower = message.toLowerCase();
  const reportDone = Boolean(body?.report);
  if (lower.includes('what should i do next') || lower.includes('next move')) {
    if (!outcomes.length) {
      return toNextMoveShape({
      headline: 'Plan your top 3 now',
      do_now: 'Choose day type and generate your plan.',
      steps: ['Pick day type', 'Generate 3 outcomes', 'Start first focus block'],
      why_it_matters: 'A clear plan removes drift.',
      avoid: 'Do not start random tasks first.',
      timebox_minutes: 10,
      action_buttons: [{ label: 'Plan today', action: 'none' }],
        direct_answer: 'You do not have a plan yet. Start by planning today.',
        next_action: 'Create a 3-outcome plan for your selected day type.',
        proof_needed: 'Three outcomes with first action and evidence requirement.',
        suggested_focus_minutes: 10,
        focus_minutes: 10,
        drift_warning: '',
        priority_reason: 'Planning first prevents random execution.',
        suggested_action: 'none',
        go_here: 'Open Plan Today modal',
        write_make_do: 'Choose day type and accept three outcomes.'
      });
    }
    if (focus?.status === 'active') {
      return toNextMoveShape({
        headline: 'Finish current mission first',
        do_now: 'Complete current action and log proof.',
        steps: ['Do one action', 'Log proof', 'Decide done or continue'],
        why_it_matters: 'Closing loops compounds execution speed.',
        avoid: 'Do not switch tasks mid-focus.',
        timebox_minutes: 15,
        action_buttons: [{ label: 'Log proof', action: 'log_proof' }, { label: 'Mark done', action: 'mark_done' }],
        direct_answer: `Finish the current mission: ${focus.title}.`,
        next_action: 'Complete current action and log evidence.',
        proof_needed: 'One evidence note for this focus block.',
        suggested_focus_minutes: 15,
        focus_minutes: 15,
        drift_warning: '',
        priority_reason: 'Closing active work beats context switching.',
        suggested_action: 'log_proof',
        go_here: 'Current Mission card',
        write_make_do: 'Finish one action and log evidence.'
      });
    }
    if (reportDone) {
      return toNextMoveShape({
        headline: 'Close and carry forward',
        do_now: 'Carry forward unfinished outcomes.',
        steps: ['Review unfinished', 'Carry forward', 'Set tomorrow first move'],
        why_it_matters: 'Tomorrow starts faster with clarity.',
        avoid: 'Do not end day without next move.',
        timebox_minutes: 10,
        action_buttons: [{ label: 'Close day', action: 'close_day' }],
        direct_answer: 'Your debrief is complete. Carry forward unfinished work or plan tomorrow.',
        next_action: 'Carry forward unfinished outcomes and define tomorrow first move.',
        proof_needed: 'Tomorrow first action defined.',
        suggested_focus_minutes: 10,
        focus_minutes: 10,
        drift_warning: '',
        priority_reason: 'A clear next-day start protects momentum.',
        suggested_action: 'close_day',
        go_here: 'Daily Debrief panel',
        write_make_do: 'Carry unfinished outcomes and set tomorrow first move.'
      });
    }
  }
  if (body?.generateTop3) {
    const dayType = body?.selected_day_type || body?.dayType || 'personal';
    const map: Record<string, string[]> = {
      build: ['Ship one scoped product improvement', 'Fix the most visible UX issue', 'Record proof/demo of progress'],
      money: ['Send 10 targeted outreach messages', 'Create one offer page or sales asset', 'Follow up with 3 warm leads'],
      admin: ['Clear highest-risk overdue task', 'Organize one recurring system', 'Document one process'],
      learning: ['Complete one learning sprint with proof', 'Apply the concept in a mini output', 'Summarize into actionable notes'],
      personal: ['Complete one meaningful life admin task', 'Protect one deep-work block', 'Close one open loop'],
      custom: ['Define one high-impact outcome', 'Break it into first concrete action', 'Capture proof by day end']
    };
    const custom = String(body?.custom_context || body?.customDirection || '').toLowerCase();
    const generated = ensureScopedOutcomes(map[dayType] || map.personal);
    const customGenerated = custom.includes('money') || custom.includes('sell')
      ? ensureScopedOutcomes(['Send 10 targeted outreach messages', 'Follow up with 5 warm leads', 'Create one offer asset or landing page section'])
      : custom.includes('build') || custom.includes('app')
        ? ensureScopedOutcomes(['Ship one scoped feature', 'Fix one visible UX issue', 'Record a demo proving the improvement'])
        : generated;
    return toNextMoveShape({
      headline: 'Top 3 ready',
      do_now: 'Pick #1 and start a 25-minute block.',
      steps: ['Pick highest leverage', 'Start focus', 'Log proof after first action'],
      why_it_matters: 'Action beats planning drift.',
      avoid: 'Do not over-edit your plan.',
      timebox_minutes: 25,
      action_buttons: [{ label: 'Start focus', action: 'start_focus' }],
      direct_answer: 'Here is a focused top 3 for your day.',
      next_action: 'Pick #1 and start a 25-minute focus block now.',
      proof_needed: 'Visible output for each outcome by day end.',
      suggested_focus_minutes: 25,
      focus_minutes: 25,
      drift_warning: '',
      priority_reason: 'Structured priorities reduce drift and improve completion odds.',
      generated_outcomes: customGenerated,
      suggested_action: 'start_focus',
      go_here: 'Top outcome card',
      write_make_do: 'Start first action now, then log proof.'
    });
  }
  if (lower.includes('5 minute') || lower.includes('reduce')) {
    return toNextMoveShape({
      headline: 'Make it tiny now',
      do_now: focus?.title ? `Do first tiny action for "${focus.title}".` : 'Do one tiny action now.',
      steps: ['Open task', 'Do 1 action', 'Log quick proof'],
      why_it_matters: 'Tiny actions break inertia.',
      avoid: 'Do not plan for longer than 2 minutes.',
      timebox_minutes: 5,
      action_buttons: [{ label: 'Log proof', action: 'log_proof' }],
      direct_answer: focus?.title ? `5-minute version: write the first concrete output for "${focus.title}".` : '5-minute version: write one concrete output now.',
      next_action: 'Start timer for 5 minutes and complete one tiny action that creates visible progress.',
      proof_needed: 'Screenshot or note showing what changed in 5 minutes.',
      suggested_focus_minutes: 5,
      focus_minutes: 5,
      drift_warning: '',
      priority_reason: 'Small concrete action breaks inertia and restores execution momentum.',
      suggested_action: 'start_focus',
      go_here: 'Current Mission card',
      write_make_do: 'Do one tiny action and capture proof.'
    });
  }
  if (!outcomes.length) {
    return toNextMoveShape({
      headline: 'Plan before execution',
      do_now: 'Generate a 3-outcome plan now.',
      steps: ['Choose day type', 'Add context', 'Accept plan'],
      why_it_matters: 'No plan means random effort.',
      avoid: 'Do not start without priorities.',
      timebox_minutes: 10,
      action_buttons: [{ label: 'Plan today', action: 'none' }],
      direct_answer: 'You have no outcomes yet. Start by choosing top 3 outcomes for today.',
      next_action: 'Open "Plan today with AI" and pick your day type.',
      proof_needed: 'Three outcome cards visible.',
      suggested_focus_minutes: 10,
      focus_minutes: 10,
      drift_warning: '',
      priority_reason: 'Without outcomes, focus decisions become random.',
      suggested_action: 'none',
      go_here: 'Plan Today modal',
      write_make_do: 'Generate three outcomes before starting work.'
    });
  }
  return toNextMoveShape({
    headline: focus?.title ? 'Stay in current mission' : 'Start highest leverage outcome',
    do_now: focus?.title ? `Do next action for "${focus.title}".` : 'Start a 25-minute focus block now.',
    steps: focus?.title ? ['Complete one action', 'Log proof', 'Mark done or continue'] : ['Pick outcome', 'Start focus', 'Log proof'],
    why_it_matters: 'Execution on one priority compounds.',
    avoid: 'Avoid context switching before proof.',
    timebox_minutes: 25,
    action_buttons: [
      { label: 'Start focus', action: 'start_focus' },
      { label: 'Log proof', action: 'log_proof' },
      { label: 'Create workflow', action: 'create_workflow' }
    ],
    direct_answer: focus?.title
      ? `Stay inside active focus: "${focus.title}".`
      : 'Start with the highest leverage outcome first.',
    next_action: focus?.title
      ? `Complete one concrete action for "${focus.title}" before context switching.`
      : 'Pick one outcome and start a 25-minute focus block now.',
    proof_needed: 'Capture one proof artifact after this focus block.',
    suggested_focus_minutes: 25,
    focus_minutes: 25,
    drift_warning: lower.includes('stuck') ? 'You are drifting into ambiguity. Choose one executable action now.' : (focus ? 'Avoid context switching before closing this action.' : ''),
    priority_reason: 'Execution on one high-value outcome compounds faster than parallel partial progress.',
    current_state_read: focus ? `Focus active on ${focus.title}` : `Outcomes ready: ${outcomes.length}`,
    recommended_outcome_id: outcomes[0]?.id ?? null,
    suggested_action: focus?.status === 'active' ? 'log_proof' : 'start_focus',
    go_here: focus?.status === 'active' ? 'Current Mission card' : 'Top outcome card',
    write_make_do: focus?.status === 'active' ? 'Finish action and upload proof.' : 'Open outcome and start first concrete step.'
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = String(body?.message ?? '');
  const client = getOpenAIClient();
  if (!client) return NextResponse.json({ ok: true, data: mockDailyResponse(message, body), source: 'mock' });
  try {
    const prompt = `You are TaskPilot Daily Command Center coach.
Your job is to coach daily execution for general users, not just building TaskPilot.

Context priority:
1) selected day type
2) today's outcomes
3) active focus block
4) user's latest message
5) blockers
6) timeline events
7) xp/streak state
8) active workflow only if relevant

Rules:
- Do NOT mention TaskPilot MVP unless user outcomes/focus explicitly mention it.
- Always prioritize the user's selected use case and current outcomes.
- If no outcomes: direct user to create top 3 outcomes.
- If outcomes exist and no focus is active: pick highest leverage and suggest first action.
- If focus is active: coach next action within focus scope.
- If report is done: suggest carry forward or tomorrow first move.
- For money questions: suggest concrete revenue/output actions.
- Never generate fantasy or impossible execution outcomes.
- Reframe unrealistic goals into a one-day feasible artifact with proof.
- Every generated outcome must be one-day scoped, proof-backed, and include a first action.
- Ban generic filler.
- You are not a motivational chatbot. You are an execution coach.
- Keep response under 120 words unless asked for detail.
- For "What next?": return do_now + up to 3 steps + proof_needed.
- For "Make it tiny": return one action that takes 2-5 minutes.
- Prefer concrete verbs: open, write, send, upload, record, screenshot, commit, test, publish.
- Enforce strict brevity:
  - next_move max 10 words
  - go_here max 12 words
  - write_make_do max 20 words
  - proof_needed max 14 words
  - avoid max 14 words
- Never output paragraph answers unless explicitly asked for detailed explanation.
- Anti-echo rule: never repeat objective as action; translate into concrete user action.

Return strict JSON:
{
 "direct_answer": string,
 "next_move": string,
 "go_here": string,
 "write_make_do": string,
 "confidence": "low" | "medium" | "high",
 "suggested_action": "start_focus" | "log_proof" | "mark_done" | "create_workflow" | "close_day" | "ask_clarifying_question" | "none",
 "clarifying_question": string,
 "current_state_read": string,
 "recommended_outcome_id": string|null,
 "next_action": string,
 "proof_needed": string,
 "focus_minutes": number,
 "should_start_focus": boolean,
 "should_mark_done": boolean,
 "should_create_workflow": boolean,
 "priority_reason": string,
 "drift_warning": string,
 "suggested_outcome_update": string (optional),
 "generated_outcomes": string[] (optional when asked to plan top 3)
}`;
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(body) }
      ],
      response_format: { type: 'json_object' }
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const merged = toNextMoveShape({ ...mockDailyResponse(message, body), ...parsed });
    if (Array.isArray(merged.generated_outcomes)) merged.generated_outcomes = ensureScopedOutcomes(merged.generated_outcomes);
    return NextResponse.json({ ok: true, data: merged, source: 'openai' });
  } catch {
    return NextResponse.json({ ok: true, data: mockDailyResponse(message, body), source: 'mock' });
  }
}
