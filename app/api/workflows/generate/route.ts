import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `workflow-${Date.now()}`;
}

function buildMockWorkflow(body: any) {
  const goal = String(body?.goal || body?.accomplish || 'Complete workflow');
  const category = String(body?.category || 'custom');
  const difficulty = String(body?.skill_level || 'intermediate');
  const stepsCount = Math.min(14, Math.max(6, Number(body?.steps_count || 10)));
  const outputStyle = String(body?.output_style || 'technical checklist');
  const toolList = body?.tools ? String(body.tools).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const steps = Array.from({ length: stepsCount }).map((_, idx) => ({
    step_number: idx + 1,
    title: idx === 0 ? 'Define concrete target and constraints' : `Execute verifiable step ${idx + 1}`,
    instructions:
      idx === 0
        ? `Write the exact target for "${goal}", success criteria, and tools. Output style: ${outputStyle}.`
        : category === 'coding'
          ? `Run and verify part ${idx + 1}. Include file paths, command(s), and expected command output.`
          : category === 'deployment'
            ? `Execute deploy task ${idx + 1}. Include env checks and URL verification.`
            : category === 'robot'
              ? `Test robot task ${idx + 1} with concrete endpoint/curl commands.`
              : `Execute and verify part ${idx + 1} with concrete proof.`,
    expected_state: `A visible deliverable exists for step ${idx + 1} and can be shown as proof.`,
    common_mistakes: ['Skipping validation', 'Too broad action'],
    visual_checks: ['Visible output or screenshot', 'Proof attached in notes or upload'],
    troubleshooting: ['Narrow the action and rerun validation for this step.'],
    completion_criteria: `Step ${idx + 1} output is verifiable with proof.`
  }));
  return {
    workflow_name: `${goal.slice(0, 80)} Workflow`,
    slug: slugify(goal),
    category,
    difficulty,
    goal,
    description: `Generated workflow for: ${goal}`,
    estimated_time: `${stepsCount * 15} minutes`,
    required_tools: toolList,
    required_materials: [],
    prerequisites: [],
    steps,
    completion_criteria: 'All steps completed with proof.',
    generation_quality: {
      specificity_score: 84,
      usability_score: 86,
      missing_details: [],
      improvement_suggestions: ['Tailor tool versions to your local environment.', 'Add concrete timing estimates per step.']
    },
    report_template: {
      summary: 'Generated workflow completed.',
      issues_found: [],
      fixes_made: [],
      recommendations: ['Run verification', 'Capture proof', 'Plan next milestone']
    }
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = getOpenAIClient();
  if (!client) return NextResponse.json({ ok: true, workflow: buildMockWorkflow(body), source: 'mock' });
  try {
    const prompt = `Generate a practical workflow JSON with keys:
workflow_name,slug,category,difficulty,goal,description,estimated_time,required_tools,required_materials,prerequisites,steps,completion_criteria,generation_quality,report_template.
Rules:
- 6-14 steps
- every step title starts with an action verb
- every step has concrete expected_state and completion_criteria
- include common_mistakes and visual_checks per step
- coding workflows must reference likely files, commands, settings, routes, or env vars
- deployment workflows must include exact health/setup/test URLs and env checks
- robot workflows must include endpoint tests and curl examples
- business workflows include concrete deliverables
- research workflows include source types and decision criteria
- split broad steps into smaller steps
- avoid vague words: optimize, improve, finalize, research thoroughly
- generation_quality must include:
  - specificity_score (0-100)
  - usability_score (0-100)
  - missing_details (string[])
  - improvement_suggestions (string[])`;
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(body) }
      ],
      response_format: { type: 'json_object' }
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const merged = { ...buildMockWorkflow(body), ...parsed };
    merged.slug = slugify(merged.slug || merged.workflow_name || body?.goal || 'generated-workflow');
    if (!merged.generation_quality) {
      merged.generation_quality = {
        specificity_score: 80,
        usability_score: 80,
        missing_details: [],
        improvement_suggestions: []
      };
    }
    return NextResponse.json({ ok: true, workflow: merged, source: 'openai' });
  } catch (error) {
    return NextResponse.json({ ok: true, workflow: buildMockWorkflow(body), source: 'mock', error: error instanceof Error ? error.message : 'generation_failed' });
  }
}
