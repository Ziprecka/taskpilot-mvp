import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { getCurrentUser, getCurrentUserId, getUserProfile } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { trackUsageEvent } from '@/lib/usage';

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
    objective: `Complete measurable milestone ${idx + 1} for: ${goal}`,
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
    proof_required: category === 'coding' ? 'Command output, file diff, or screenshot.' : 'Screenshot, note, or artifact showing execution.',
    common_mistakes: ['Skipping validation', 'Too broad action'],
    visual_checks: ['Visible output or screenshot', 'Proof attached in notes or upload'],
    troubleshooting: ['Narrow the action and rerun validation for this step.'],
    completion_criteria: `Step ${idx + 1} output is verifiable with proof.`,
    estimated_minutes: 10 + idx * 2,
    ai_check_prompt: `Check whether step ${idx + 1} evidence proves expected state was reached.`
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
    success_definition: `Goal "${goal}" is complete with proof for each step.`,
    failure_conditions: ['Missing proof for key steps', 'Critical blockers unresolved'],
    steps,
    completion_criteria: 'All steps completed with proof.',
    verification_plan: ['Validate each step expected state', 'Check proof artifacts', 'Confirm final success definition'],
    generation_quality: {
      specificity_score: 84,
      actionability_score: 85,
      verifiability_score: 88,
      estimated_usefulness_score: 86,
      usability_score: 86,
      missing_details: toolList.length ? [] : ['missing tools'],
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
  const { user } = await getCurrentUser();
  const userId = await getCurrentUserId();
  const betaUnlimited = process.env.TASKPILOT_BETA_UNLIMITED === 'true' || process.env.NEXT_PUBLIC_TASKPILOT_BETA_UNLIMITED === 'true';
  const betaAdminEmails = String(process.env.TASKPILOT_BETA_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isBetaAdmin = Boolean(user?.email && betaAdminEmails.includes(user.email.toLowerCase()));
  const bypassLimits = betaUnlimited || isBetaAdmin;
  if (userId) {
    const profile = await getUserProfile(userId);
    if ((profile?.plan || 'free') === 'free' && !bypassLimits) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const usage = await admin
          .from('usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('event_type', 'playbook_generated')
          .gte('created_at', monthStart.toISOString());
        if ((usage.count || 0) >= 3 && process.env.NODE_ENV === 'production') {
          return NextResponse.json({
            ok: false,
            code: 'playbook_generation_limit',
            error: 'You’ve hit today’s playbook generation limit.',
            upgrade_required: true,
            daily_planning_available: true
          }, { status: 402 });
        }
      }
    }
  }
  const client = getOpenAIClient();
  if (!client) {
    if (userId) await trackUsageEvent(userId, 'playbook_generated', { source: 'mock' });
    return NextResponse.json({ ok: true, workflow: buildMockWorkflow(body), source: 'mock', requires_login_to_save: !userId, beta_admin: isBetaAdmin });
  }
  try {
    const prompt = `Generate a practical workflow JSON with keys:
workflow_name,slug,category,difficulty,goal,description,estimated_time,required_tools,required_materials,prerequisites,success_definition,failure_conditions,steps,completion_criteria,verification_plan,generation_quality,report_template.
Rules:
- 6-14 steps
- every step title starts with an action verb
- every step has: objective,instructions,expected_state,proof_required,completion_criteria,estimated_minutes,ai_check_prompt
- include common_mistakes and visual_checks per step
- coding workflows must reference likely files, commands, settings, routes, or env vars
- deployment workflows must include exact health/setup/test URLs and env checks
- robot workflows must include endpoint tests and curl examples
- business workflows include concrete deliverables
- research workflows include source types and decision criteria
- daily productivity workflows include proof of execution
- split broad steps into smaller steps
- avoid vague words: optimize, improve, finalize, research thoroughly
- generation_quality must include:
  - specificity_score (0-100)
  - actionability_score (0-100)
  - verifiability_score (0-100)
  - estimated_usefulness_score (0-100)
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
        actionability_score: 80,
        verifiability_score: 80,
        estimated_usefulness_score: 80,
        usability_score: 80,
        missing_details: [],
        improvement_suggestions: []
      };
    }
    if (userId) await trackUsageEvent(userId, 'playbook_generated', { source: 'openai' });
    return NextResponse.json({ ok: true, workflow: merged, source: 'openai', requires_login_to_save: !userId, beta_admin: isBetaAdmin });
  } catch (error) {
    if (userId) await trackUsageEvent(userId, 'playbook_generated', { source: 'mock_fallback_on_error' });
    return NextResponse.json({ ok: true, workflow: buildMockWorkflow(body), source: 'mock', error: error instanceof Error ? error.message : 'generation_failed', requires_login_to_save: !userId, beta_admin: isBetaAdmin });
  }
}
