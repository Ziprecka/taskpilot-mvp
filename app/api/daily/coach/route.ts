import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import type { DailyAIResponse } from '@/types/workflow';

function mockDailyResponse(message: string): DailyAIResponse {
  const lower = message.toLowerCase();
  if (lower.includes('5 minute') || lower.includes('reduce')) {
    return {
      direct_answer: 'Start with a 5-minute action: open the target file and add the first TODO implementation block.',
      next_action: 'Open the relevant file now and add one minimal implementation + test scaffold in 5 minutes.',
      proof_needed: 'Paste the changed file path and one screenshot/log line.',
      suggested_focus_minutes: 5,
      drift_warning: '',
      priority_reason: 'Small concrete action breaks inertia and restores execution momentum.'
    };
  }
  return {
    direct_answer: 'Focus on the highest leverage outcome first: unblock persistence and delivery.',
    next_action: 'Pick one outcome and start a 25-minute focus block with a single concrete commit target.',
    proof_needed: 'Show updated file paths or screenshot after block.',
    suggested_focus_minutes: 25,
    drift_warning: lower.includes('stuck') ? 'You are drifting into ambiguity. Choose one executable action now.' : '',
    priority_reason: 'Execution on one high-value outcome compounds faster than parallel partial progress.'
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = String(body?.message ?? '');
  const client = getOpenAIClient();
  if (!client) return NextResponse.json({ ok: true, data: mockDailyResponse(message), source: 'mock' });
  try {
    const prompt = `You are TaskPilot Daily Mode, a persistent productivity coach.
Prioritize money-making and product-building execution.
Return strict JSON with keys: direct_answer,next_action,proof_needed,suggested_focus_minutes,drift_warning,priority_reason,updated_outcome_status(optional).
Never return generic filler.`;
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(body) }
      ],
      response_format: { type: 'json_object' }
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json({ ok: true, data: { ...mockDailyResponse(message), ...parsed }, source: 'openai' });
  } catch {
    return NextResponse.json({ ok: true, data: mockDailyResponse(message), source: 'mock' });
  }
}
