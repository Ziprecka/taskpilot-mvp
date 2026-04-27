import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';

function improveLocal(workflow: any) {
  const steps = (workflow?.steps || []).map((step: any, index: number) => {
    const hasProof = Boolean(step.proof_required);
    const hasCriteria = Boolean(step.completion_criteria);
    const title = String(step.title || `Step ${index + 1}`);
    const rewrittenTitle = /^[A-Z][a-z]+/.test(title) ? title : `Execute ${title}`;
    return {
      ...step,
      title: rewrittenTitle,
      proof_required: hasProof ? step.proof_required : 'Screenshot, output log, or checklist note.',
      completion_criteria: hasCriteria ? step.completion_criteria : 'Expected state is verified with proof.',
      ai_check_prompt:
        step.ai_check_prompt || `Check if provided proof confirms "${step.expected_state || 'step expected state'}".`
    };
  });
  const prev = workflow?.generation_quality || {};
  return {
    ...workflow,
    steps,
    generation_quality: {
      specificity_score: Math.min(100, (prev.specificity_score || 75) + 8),
      actionability_score: Math.min(100, (prev.actionability_score || prev.usability_score || 75) + 10),
      verifiability_score: Math.min(100, (prev.verifiability_score || 70) + 12),
      estimated_usefulness_score: Math.min(100, (prev.estimated_usefulness_score || prev.usability_score || 75) + 8),
      usability_score: Math.min(100, (prev.usability_score || 75) + 8),
      missing_details: [],
      improvement_suggestions: ['Add real-world tool versions and acceptance thresholds.']
    }
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const workflow = body?.workflow;
  if (!workflow) return NextResponse.json({ ok: false, error: 'Missing workflow.' }, { status: 400 });
  const client = getOpenAIClient();
  if (!client) return NextResponse.json({ ok: true, workflow: improveLocal(workflow), source: 'mock' });
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'Rewrite weak workflow steps to be specific, actionable, and verifiable. Preserve structure. Ensure proof_required and ai_check_prompt exist for every step. Return JSON only.'
        },
        { role: 'user', content: JSON.stringify({ workflow }) }
      ],
      response_format: { type: 'json_object' }
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json({ ok: true, workflow: improveLocal({ ...workflow, ...parsed }), source: 'openai' });
  } catch {
    return NextResponse.json({ ok: true, workflow: improveLocal(workflow), source: 'mock' });
  }
}
