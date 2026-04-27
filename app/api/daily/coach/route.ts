import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import type { DailyAIResponse } from '@/types/workflow';

function mockDailyResponse(message: string, body: any): DailyAIResponse & { generated_outcomes?: string[] } {
  const outcomes = Array.isArray(body?.outcomes) ? body.outcomes : [];
  const focus = body?.focus;
  const lower = message.toLowerCase();
  if (body?.generateTop3) {
    const dayType = body?.dayType || 'personal';
    const map: Record<string, string[]> = {
      build: ['Ship one scoped product improvement', 'Fix the most visible UX issue', 'Record proof/demo of progress'],
      money: ['Send 10 targeted outreach messages', 'Create one offer page or sales asset', 'Follow up with 3 warm leads'],
      admin: ['Clear highest-risk overdue task', 'Organize one recurring system', 'Document one process'],
      learning: ['Complete one learning sprint with proof', 'Apply the concept in a mini output', 'Summarize into actionable notes'],
      personal: ['Complete one meaningful life admin task', 'Protect one deep-work block', 'Close one open loop'],
      custom: ['Define one high-impact outcome', 'Break it into first concrete action', 'Capture proof by day end']
    };
    return {
      direct_answer: 'Here is a focused top 3 for your day.',
      next_action: 'Pick #1 and start a 25-minute focus block now.',
      proof_needed: 'Visible output for each outcome by day end.',
      suggested_focus_minutes: 25,
      focus_minutes: 25,
      drift_warning: '',
      priority_reason: 'Structured priorities reduce drift and improve completion odds.',
      generated_outcomes: map[dayType] || map.personal
    };
  }
  if (lower.includes('5 minute') || lower.includes('reduce')) {
    return {
      direct_answer: focus?.title ? `5-minute version: write the first concrete output for "${focus.title}".` : '5-minute version: write one concrete output now.',
      next_action: 'Start timer for 5 minutes and complete one tiny action that creates visible progress.',
      proof_needed: 'Screenshot or note showing what changed in 5 minutes.',
      suggested_focus_minutes: 5,
      focus_minutes: 5,
      drift_warning: '',
      priority_reason: 'Small concrete action breaks inertia and restores execution momentum.'
    };
  }
  if (!outcomes.length) {
    return {
      direct_answer: 'You have no outcomes yet. Start by choosing top 3 outcomes for today.',
      next_action: 'Open "Plan today with AI" and pick your day type.',
      proof_needed: 'Three outcome cards visible.',
      suggested_focus_minutes: 10,
      focus_minutes: 10,
      drift_warning: '',
      priority_reason: 'Without outcomes, focus decisions become random.'
    };
  }
  return {
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
    priority_reason: 'Execution on one high-value outcome compounds faster than parallel partial progress.'
  };
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
1) today's outcomes
2) active focus block
3) user's latest message
4) blockers
5) timeline events
6) day type
7) active workflow only if relevant

Rules:
- Do NOT mention TaskPilot MVP unless user outcomes/focus explicitly mention it.
- If no outcomes: direct user to create top 3 outcomes.
- If outcomes exist and no focus is active: pick highest leverage and suggest first action.
- If focus is active: coach next action within focus scope.
- For money questions: suggest concrete revenue/output actions.
- Ban generic filler.

Return strict JSON:
{
 "direct_answer": string,
 "next_action": string,
 "proof_needed": string,
 "focus_minutes": number,
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
    return NextResponse.json({ ok: true, data: { ...mockDailyResponse(message, body), ...parsed }, source: 'openai' });
  } catch {
    return NextResponse.json({ ok: true, data: mockDailyResponse(message, body), source: 'mock' });
  }
}
