import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { buildPlan } from '@/lib/planBuilder';
import { enhancePlanWithExecutionAssets } from '@/lib/planExecutionAssets';
import { PLAN_BUILDER_RESPONSE_SCHEMA } from '@/lib/planBuilderSchema';
import { PLAN_BUILDER_SYSTEM_PROMPT, createPlanBuilderUserPrompt } from '@/lib/planBuilderPrompt';
import { validatePlanAgainstGoal } from '@/lib/planValidation';
import type { DailyOutcome } from '@/types/workflow';
import type { PlanBuilderOutput } from '@/types/planBuilder';

function mapMissionCategory(executionPattern: string): DailyOutcome['category'] {
  if (/sell|outreach|admin|recover/i.test(executionPattern)) return 'money';
  if (/build|fix|debug|organize/i.test(executionPattern)) return 'build';
  if (/learn|research/i.test(executionPattern)) return 'learning';
  if (/publish|grow/i.test(executionPattern)) return 'marketing';
  return 'other';
}

function missionToOutcome(mission: any, idx: number, category: DailyOutcome['category']): DailyOutcome {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: String(mission.title || `Mission ${idx + 1}`),
    objective: String(mission.objective || ''),
    why_it_matters: String(mission.objective || 'Moves the goal forward.'),
    category,
    priority: Math.min(3, idx + 1) as 1 | 2 | 3,
    status: 'planned',
    estimated_minutes: Math.max(10, Number(mission.estimated_minutes || 25)),
    actual_minutes: 0,
    proof_required: String(mission.proof_required || 'Screenshot proof'),
    proof_provided: '',
    first_action: String(mission.first_action || ''),
    checklist: Array.isArray(mission.checklist) ? mission.checklist.map(String) : [],
    done_when: String(mission.done_when || ''),
    risk: String(mission.risk || 'Scope drift'),
    leverage_score: Math.max(1, Math.min(10, Number(mission.leverage_score || 7))),
    money_potential: ['none', 'low', 'medium', 'high'].includes(String(mission.money_potential)) ? String(mission.money_potential) as any : 'low',
    urgency: 'medium',
    effort: 'medium',
    created_at: now,
    updated_at: now,
    completed_at: null
  };
}

function aiPlanToOutput(input: any, aiPlan: any): PlanBuilderOutput {
  const category = mapMissionCategory(String(aiPlan.execution_pattern || ''));
  const outcomes = (Array.isArray(aiPlan.missions) ? aiPlan.missions : []).slice(0, 5).map((m: any, idx: number) => missionToOutcome(m, idx, category));
  const deliverables = Array.isArray(aiPlan.deliverables) ? aiPlan.deliverables.map(String) : [];
  const proofChecklist = Array.isArray(aiPlan.proof_checklist) ? aiPlan.proof_checklist.map(String) : [];

  return {
    detected_work_type: 'custom',
    interpreted_goal: String(aiPlan.interpreted_goal || input.raw_goal || ''),
    confidence: ['low', 'medium', 'high'].includes(String(aiPlan.confidence)) ? aiPlan.confidence : 'medium',
    plan_style: aiPlan.plan_style,
    execution_pattern: aiPlan.execution_pattern,
    assumptions: [
      ...(Array.isArray(aiPlan.assumptions) ? aiPlan.assumptions.map(String) : []),
      ...(Array.isArray(aiPlan.prohibited_items) ? aiPlan.prohibited_items.map((x: string) => `prohibited: ${x}`) : [])
    ],
    clarifying_questions: [],
    plan_title: `${String(aiPlan.execution_pattern || 'execution').replace(/_/g, ' ')} plan`,
    plan_summary: `Goal-first execution plan generated from goal, outcome, and constraints.`,
    sections: [
      ...(deliverables.length ? [{ id: 'deliverables', title: 'Deliverables', items: deliverables }] : []),
      ...(proofChecklist.length ? [{ id: 'proof', title: 'Proof checklist', items: proofChecklist }] : [])
    ],
    proof_checklist: proofChecklist,
    daily_outcomes: outcomes,
    today_missions: outcomes.map((o: any) => ({
      title: o.title,
      objective: o.objective || o.why_it_matters,
      first_action: o.first_action || '',
      checklist: o.checklist || [],
      proof_required: o.proof_required,
      estimated_minutes: o.estimated_minutes,
      risk: o.risk || '',
      done_when: o.done_when || '',
      category: o.category,
      leverage_score: o.leverage_score || 7,
      money_potential: o.money_potential === 'high' || o.money_potential === 'medium' ? o.money_potential : 'low'
    })),
    extracted_goal_facts: {
      object: input.raw_goal || 'goal',
      action: 'execute',
      desired_outcome: input.desired_outcome || aiPlan.interpreted_goal || input.raw_goal || '',
      constraints: Array.isArray(aiPlan.constraints_respected) ? aiPlan.constraints_respected.map(String) : [],
      deliverables,
      proof_signals: proofChecklist,
      tools: [],
      domain_terms: [],
      unknowns: []
    },
    next_move: {
      direct_answer: aiPlan.copilot_seed?.next_action || outcomes[0]?.first_action || 'Start first mission.',
      next_move: outcomes[0]?.title || 'Start first mission',
      go_here: 'Mission 1',
      write_make_do: outcomes[0]?.first_action || '',
      proof_needed: outcomes[0]?.proof_required || 'Proof screenshot',
      avoid: 'Do not drift from goal constraints.',
      suggested_action: 'start_focus',
      next_action: aiPlan.copilot_seed?.next_action || outcomes[0]?.first_action || 'Start now',
      suggested_focus_minutes: 15,
      priority_reason: 'Highest-leverage mission first.',
      drift_warning: ''
    },
    copilot_seed: {
      next_action: String(aiPlan.copilot_seed?.next_action || outcomes[0]?.first_action || 'Start first mission'),
      draft_assets: Array.isArray(aiPlan.copilot_seed?.draft_assets) ? aiPlan.copilot_seed.draft_assets.map(String) : [],
      likely_blockers: Array.isArray(aiPlan.copilot_seed?.likely_blockers) ? aiPlan.copilot_seed.likely_blockers.map(String) : []
    }
  };
}

async function generateAiPlan(openai: ReturnType<typeof getOpenAIClient>, payload: any) {
  const response = await openai!.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      { role: 'system', content: [{ type: 'input_text', text: PLAN_BUILDER_SYSTEM_PROMPT }] },
      { role: 'user', content: [{ type: 'input_text', text: createPlanBuilderUserPrompt(payload) }] }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'taskpilot_plan_builder',
        schema: PLAN_BUILDER_RESPONSE_SCHEMA as any,
        strict: true
      }
    }
  });
  return JSON.parse(response.output_text || '{}');
}

function withExecutionAssets(payload: any, plan: PlanBuilderOutput): PlanBuilderOutput {
  return enhancePlanWithExecutionAssets(payload, plan);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const payload = {
    raw_goal: String(body?.raw_goal || ''),
    desired_outcome: String(body?.desired_outcome || ''),
    constraints: String(body?.constraints || ''),
    mode: String(body?.mode || 'daily_execution'),
    user_context: String(body?.user_context || '')
  };
  const openai = getOpenAIClient();

  if (!openai) {
    const fallback = buildPlan({
      raw_goal: payload.raw_goal,
      desired_outcome: payload.desired_outcome,
      constraints: payload.constraints,
      mode: payload.mode as any,
      category: 'productivity',
      time_horizon: 'today',
      user_context: payload.user_context
    });
    const plan = withExecutionAssets(payload, fallback);
    return NextResponse.json({ ok: true, source: 'fallback', plan });
  }

  try {
    let ai = await generateAiPlan(openai, payload);
    let plan = aiPlanToOutput(payload, ai);
    let validation = validatePlanAgainstGoal(`${payload.raw_goal} ${payload.desired_outcome} ${payload.constraints}`, plan);

    if (!validation.ok) {
      const repairPrompt = {
        ...payload,
        bad_plan: ai,
        issues: validation.issues,
        instruction: 'Repair only broken parts. Respect prohibited items and constraints.'
      };
      ai = await generateAiPlan(openai, repairPrompt);
      plan = aiPlanToOutput(payload, ai);
      validation = validatePlanAgainstGoal(`${payload.raw_goal} ${payload.desired_outcome} ${payload.constraints}`, plan);
      if (!validation.ok) {
        plan.clarifying_questions = ['One detail needed: what exact artifact should prove success today?'];
      }
    }

    plan.relevance_score = validation.relevanceScore;
    plan.relevance_label = validation.relevanceScore >= 8 ? 'strong' : validation.relevanceScore >= 5 ? 'good' : 'weak';
    plan = withExecutionAssets(payload, plan);
    return NextResponse.json({ ok: true, source: 'openai', plan, validation });
  } catch {
    const fallback = buildPlan({
      raw_goal: payload.raw_goal,
      desired_outcome: payload.desired_outcome,
      constraints: payload.constraints,
      mode: payload.mode as any,
      category: 'productivity',
      time_horizon: 'today',
      user_context: payload.user_context
    });
    const plan = withExecutionAssets(payload, fallback);
    return NextResponse.json({ ok: true, source: 'fallback_on_error', plan });
  }
}
