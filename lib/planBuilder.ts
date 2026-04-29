import type { DailyOutcome, Workflow, WorkflowCategory, WorkflowStep } from '@/types/workflow';
import type {
  DailyNextMoveResponse,
  DetectedWorkType,
  ExecutionPattern,
  GoalFacts,
  MessageTemplate,
  PlanBuilderInput,
  PlanBuilderOutput,
  PlannerSpecificity
} from '@/types/planBuilder';

const WORK_TYPE_LABELS: Record<DetectedWorkType, string> = {
  service_day: 'Service Day',
  service_business_sales: 'Service Business Sales',
  client_work_day: 'Client Work Day',
  sales_day: 'Sales Day',
  hardware_setup: 'Hardware Setup',
  app_build: 'App Build',
  research: 'Research',
  admin: 'Admin',
  learning: 'Learning',
  personal: 'Personal',
  custom: 'Custom'
};

const BANNED_GENERIC = ['rewrite your goal', 'improve workflow', 'do one task', 'make progress', 'continue current mission'];
const VAGUE_ONLY = /^(fix it|improve things|do better|project|stuff)$/i;
export function extractNegativeConstraints(rawText: string): string[] {
  const parts = rawText
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const negatives = parts.filter((p) => /\b(do not|don't|no |avoid|without|not |never)\b/i.test(p));
  const normalized = negatives
    .map((n) => n.replace(/\b(do not|don't|avoid|never)\b/gi, '').replace(/\bwithout\b/gi, '').trim())
    .map((n) => n.replace(/^to\s+/i, '').replace(/^a\s+/i, '').trim())
    .filter((n) => n.length > 2);
  const crm = /\bfull crm|overbuild.*crm|crm\b/i.test(rawText) ? ['full CRM', 'overbuilt CRM'] : [];
  return Array.from(new Set([...normalized, ...crm]));
}

const ACTION_WORDS = ['build', 'grow', 'find', 'organize', 'ship', 'make', 'compare', 'fix', 'prepare', 'learn', 'publish', 'sell', 'clean', 'plan'];

export function workTypeLabel(type: DetectedWorkType): string {
  return WORK_TYPE_LABELS[type] || 'Custom';
}

function nowIso() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function extractEntities(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3)
    )
  ).slice(0, 10);
}

function outcomeBase(partial: Omit<DailyOutcome, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): DailyOutcome {
  const t = nowIso();
  return { ...partial, id: id(), created_at: t, updated_at: t, completed_at: null };
}

function inferAction(raw: string): string {
  const s = raw.toLowerCase();
  return ACTION_WORDS.find((w) => s.includes(w)) || 'execute';
}

function inferObject(raw: string, action: string): string {
  const s = raw.replace(/[.?!]+$/, '');
  const m = s.match(new RegExp(`${action}\\s+(.+)`, 'i'));
  if (m?.[1]) return m[1].trim();
  return s.split(/\s+/).slice(-5).join(' ') || 'goal';
}

function stripNegativeClauses(raw: string): string {
  return raw
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s && !/\b(do not|don't|no |avoid|without|never)\b/i.test(s))
    .join('. ');
}

function inferPattern(raw: string): ExecutionPattern {
  const s = raw.toLowerCase();
  if (/\b(leads?|outreach|prospects?|booking|sell|revenue|money|follow up|appointments?)\b/.test(s)) return 'sell_or_outreach';
  if (/\b(build|create|ship|prototype|saas|app|hydroponic|herb|shelf)\b/.test(s)) return 'create_or_build';
  if (/\b(organize|clean|garage|workspace|declutter)\b/.test(s)) return 'organize_or_clean';
  if (/\b(compare|research|evaluate|decide|tools)\b/.test(s)) return 'research_or_decide';
  if (/\b(learn|study|practice)\b/.test(s)) return 'learn_or_practice';
  if (/\b(fix|debug|bug|screen|error|atom|s3r|firmware)\b/.test(s)) return 'fix_or_debug';
  if (/\b(prepare|meeting|plan)\b/.test(s)) return 'prepare_or_plan';
  if (/\b(grow|followers|publish|post|account)\b/.test(s)) return 'publish_or_grow';
  if (/\b(invoice|admin|recover|overdue|unpaid)\b/.test(s)) return 'admin_or_recover';
  if (/\b(health|sleep|workout|personal)\b/.test(s)) return 'health_or_personal';
  return 'create_or_build';
}

function patternToWorkType(pattern: ExecutionPattern): DetectedWorkType {
  if (pattern === 'sell_or_outreach') return 'service_business_sales';
  if (pattern === 'publish_or_grow') return 'sales_day';
  if (pattern === 'fix_or_debug') return 'hardware_setup';
  if (pattern === 'research_or_decide') return 'research';
  if (pattern === 'learn_or_practice') return 'learning';
  if (pattern === 'admin_or_recover') return 'admin';
  if (pattern === 'health_or_personal') return 'personal';
  if (pattern === 'prepare_or_plan') return 'client_work_day';
  if (pattern === 'create_or_build') return /\bsaas|app|feature|deploy|cursor\b/i.test(pattern) ? 'app_build' : 'custom';
  return 'custom';
}

function inferPlanStyle(pattern: ExecutionPattern): PlanBuilderOutput['plan_style'] {
  if (pattern === 'sell_or_outreach' || pattern === 'admin_or_recover') return 'Money-focused';
  if (pattern === 'create_or_build' || pattern === 'fix_or_debug') return 'Build-ready';
  if (pattern === 'learn_or_practice' || pattern === 'research_or_decide') return 'Learning';
  if (pattern === 'prepare_or_plan') return 'Deep work';
  return 'Fast win';
}

function inferDeliverables(raw: string, pattern: ExecutionPattern): string[] {
  const s = raw.toLowerCase();
  if (/\bhydroponic|herb|basil|mint\b/.test(s)) return ['parts list', 'layout sketch', 'water/light setup', 'build steps', 'estimated cost', 'proof checklist'];
  if (pattern === 'publish_or_grow') return ['profile promise', 'post drafts', 'engagement plan', 'tracking sheet'];
  if (pattern === 'sell_or_outreach') return ['prospect list', 'message drafts', 'follow-up tracker', 'proof log'];
  if (pattern === 'organize_or_clean') return ['cleared zone', 'sorting map', 'cleanup checklist', 'before/after proof'];
  if (pattern === 'research_or_decide') return ['search plan', 'comparison table', 'decision criteria', 'summary'];
  if (pattern === 'fix_or_debug') return ['repro steps', 'debug path', 'fix plan', 'verification proof'];
  if (pattern === 'create_or_build') return ['scope', 'implementation checklist', 'test checklist', 'proof checklist'];
  return ['target definition', 'execution checklist', 'proof checklist', 'report'];
}

export function extractGoalFacts(rawGoal: string, extraConstraints?: string): GoalFacts {
  const raw = stripNegativeClauses(rawGoal.trim());
  const action = inferAction(raw);
  const object = inferObject(raw, action);
  const timeframe = raw.match(/\b(today|tomorrow|this week|weekend)\b/i)?.[1];
  const constraints = [
    ...(/\b(simple|beginner|quick|fast)\b/i.test(raw) ? ['simple approach'] : []),
    ...(/\b(common|at-home|local|indoors)\b/i.test(raw) ? ['use common accessible setup'] : []),
    ...(/\bwithout|no\b/i.test(raw) ? ['explicit constraints in goal text'] : [])
  ];
  const prohibited = extractNegativeConstraints(`${raw} ${extraConstraints || ''}`);
  const pattern = inferPattern(raw);
  const deliverables = inferDeliverables(raw, pattern);
  const proof_signals = /\b(photo|screenshot|proof|report)\b/i.test(raw) ? ['photo or screenshot proof'] : ['proof checklist', 'end-of-day report'];
  const tools = /\b(app|saas|cursor|code|deploy)\b/i.test(raw) ? ['Cursor', 'terminal'] : ['notes', 'checklist'];
  const domain_terms = extractEntities(raw);
  const desired_outcome = `${action} ${object} with a practical, proof-backed result`;
  const unknowns = raw.length < 8 || VAGUE_ONLY.test(raw) ? ['missing concrete object and desired result'] : [];
  return { object, action, desired_outcome, timeframe, constraints: [...constraints, ...prohibited.map((p) => `Do not ${p}`)], deliverables, proof_signals, tools, domain_terms, unknowns };
}

export function detectWorkType(raw: string): DetectedWorkType {
  return patternToWorkType(inferPattern(raw));
}

function missionCategory(pattern: ExecutionPattern): DailyOutcome['category'] {
  if (pattern === 'sell_or_outreach' || pattern === 'admin_or_recover') return 'money';
  if (pattern === 'create_or_build' || pattern === 'fix_or_debug' || pattern === 'organize_or_clean') return 'build';
  if (pattern === 'publish_or_grow') return 'marketing';
  if (pattern === 'learn_or_practice' || pattern === 'research_or_decide') return 'learning';
  return 'other';
}

function buildUniversalMissions(facts: GoalFacts, pattern: ExecutionPattern): DailyOutcome[] {
  const cat = missionCategory(pattern);
  const base = facts.deliverables;
  const prohibited = (facts.constraints || []).join(' ').toLowerCase();
  const safeDeliverables = base.filter((d) => !prohibited.includes(d.toLowerCase()) && !/crm/i.test(d.toLowerCase()));
  const primary = safeDeliverables[0] || 'target segment';
  const secondary = safeDeliverables[1] || 'tracker';
  const tertiary = safeDeliverables[2] || 'message draft';
  const titles = [
    `Define target for ${facts.object}`,
    `Build ${primary}`,
    `Create ${secondary} and ${tertiary}`,
    `Execute first actions for ${facts.object}`,
    `Log proof and follow-up`
  ];
  return titles.map((title, idx) =>
    outcomeBase({
      title,
      objective: `${facts.desired_outcome}`,
      why_it_matters: 'Each mission directly contributes to requested deliverables.',
      category: cat,
      priority: Math.min(3, idx + 1) as 1 | 2 | 3,
      status: 'planned',
      estimated_minutes: idx === 1 ? 45 : idx === 2 ? 60 : 25,
      actual_minutes: 0,
      proof_required: idx < 3 ? `${facts.proof_signals[0]} for ${title.toLowerCase()}` : 'Daily report with completed deliverables and proof links.',
      proof_provided: '',
      first_action: idx === 0
        ? `Write one success sentence for ${facts.object} and choose the highest-leverage path.`
        : idx === 1
          ? `Draft ${base.slice(0, 2).join(' and ')} in your working doc.`
          : idx === 2
            ? `Execute the first practical step that produces ${base[0]}.`
            : 'Attach proof and record what to carry forward tomorrow.',
      checklist: [
        `Complete: ${safeDeliverables[idx] || 'target definition'}`,
        'Avoid unrelated work',
        'Update proof notes'
      ],
      done_when: `Deliverable complete: ${safeDeliverables[idx] || 'report'} and proof captured.`,
      risk: 'Drifting into unrelated tasks.',
      leverage_score: Math.max(6, 9 - idx),
      money_potential: pattern === 'sell_or_outreach' || pattern === 'admin_or_recover' ? 'high' : 'medium',
      urgency: idx < 2 ? 'high' : 'medium',
      effort: idx === 2 ? 'high' : 'medium'
    })
  ).slice(0, 5);
}

function buildPossiblePaths(raw: string, pattern: ExecutionPattern): { paths: string[]; recommended?: string; reason?: string } {
  const s = raw.toLowerCase();
  if (/\bmake money today\b/.test(s)) {
    return {
      paths: ['Follow up warm leads', 'Send direct offers', 'Collect overdue invoices', 'Sell a simple service/product'],
      recommended: 'Follow up warm leads',
      reason: 'Warm relationships are usually closest to immediate cash.'
    };
  }
  if (pattern === 'create_or_build' && /\belectronics|atom|s3r|sensor\b/.test(s)) {
    return {
      paths: ['Sensor display prototype', 'Desk notifier device', 'Control panel', 'Environment monitor'],
      recommended: 'Sensor display prototype',
      reason: 'It validates board, wiring, firmware, and display quickly.'
    };
  }
  if (raw.split(/\s+/).length <= 5) {
    return {
      paths: ['Fast win', 'Money/revenue path', 'Build/asset path', 'Learning/research path'],
      recommended: 'Fast win',
      reason: 'A visible early win reduces ambiguity and builds momentum.'
    };
  }
  return { paths: [] };
}

function scoreSpecificity(raw: string, outcomes: DailyOutcome[]): { score: number; label: PlannerSpecificity } {
  const planText = outcomes.map((o) => `${o.title} ${o.first_action} ${o.proof_required}`).join(' ').toLowerCase();
  let score = 0;
  const hits = extractEntities(raw).filter((e) => planText.includes(e)).length;
  if (hits >= 2) score += 4;
  if (/photo|screenshot|proof|report|checklist/.test(planText)) score += 3;
  if (!BANNED_GENERIC.some((p) => planText.includes(p))) score += 2;
  if (score >= 8) return { score, label: 'strong' };
  if (score >= 5) return { score, label: 'good' };
  return { score, label: 'weak' };
}

export function validatePlanAgainstGoal(rawGoal: string, plan: PlanBuilderOutput): { ok: boolean; relevance_score: number; issues: string[] } {
  const text = (plan.daily_outcomes || []).map((o) => `${o.title} ${o.first_action} ${o.proof_required}`).join(' ').toLowerCase();
  const terms = extractEntities(rawGoal);
  const termHits = terms.filter((t) => text.includes(t)).length;
  const issues: string[] = [];
  if (termHits < 2) issues.push('Missing important domain terms.');
  if (/suds auto salon|seattle detailing|sam\b/.test(text)) issues.push('Private context leak.');
  if (BANNED_GENERIC.some((p) => text.includes(p))) issues.push('Contains banned generic phrases.');
  if (!(plan.daily_outcomes || []).every((m) => m.proof_required.toLowerCase().includes('proof') || m.proof_required.toLowerCase().includes('screenshot') || m.proof_required.toLowerCase().includes('photo') || m.proof_required.toLowerCase().includes('report'))) {
    issues.push('Proof requirements are weak.');
  }
  const relevance_score = Math.max(0, termHits * 2 + ((plan.daily_outcomes || []).length >= 3 ? 2 : 0) - issues.length * 2);
  return { ok: issues.length === 0 || relevance_score >= 6, relevance_score, issues };
}

function toMission(outcome: DailyOutcome) {
  const money: 'low' | 'medium' | 'high' =
    outcome.money_potential === 'high' || outcome.money_potential === 'medium' ? outcome.money_potential : 'low';
  return {
    title: outcome.title,
    objective: outcome.objective || outcome.why_it_matters,
    first_action: outcome.first_action || 'Start first concrete step',
    checklist: outcome.checklist || ['Execute', 'Capture proof'],
    proof_required: outcome.proof_required,
    estimated_minutes: outcome.estimated_minutes,
    risk: outcome.risk || 'Scope drift',
    done_when: outcome.done_when || 'Proof captured',
    category: outcome.category,
    leverage_score: outcome.leverage_score || 7,
    money_potential: money,
    short_title: outcome.short_title
  };
}

function workflowFromPlan(input: PlanBuilderInput, output: Omit<PlanBuilderOutput, 'playbook'>): Workflow {
  const goal = input.raw_goal.slice(0, 200);
  const steps: WorkflowStep[] = [
    {
      step_number: 1,
      title: 'Clarify scope and proof',
      instructions: 'Write success criteria and proof artifact format.',
      expected_state: 'Acceptance note saved.',
      visual_checks: ['Proof format chosen'],
      common_mistakes: ['Skipping proof definition'],
      troubleshooting: ['Narrow scope'],
      completion_criteria: 'Acceptance + proof listed.'
    },
    {
      step_number: 2,
      title: 'Execute primary work block',
      instructions: 'Do the core labor with timebox; capture interim notes.',
      expected_state: 'Primary artifact exists.',
      visual_checks: ['Visible progress'],
      common_mistakes: ['Context switching'],
      troubleshooting: ['Shorten scope'],
      completion_criteria: 'Artifact matches acceptance.'
    },
    {
      step_number: 3,
      title: 'Verify and publish proof',
      instructions: 'Attach screenshots/logs/links as required.',
      expected_state: 'Proof stored shareably.',
      visual_checks: ['Proof readable'],
      common_mistakes: ['Missing timestamps'],
      troubleshooting: ['Retake proof'],
      completion_criteria: 'Proof passes checklist.'
    }
  ];

  if (output.schedule_blocks?.length) {
    output.schedule_blocks.slice(0, 5).forEach((b, i) => {
      steps.push({
        step_number: steps.length + 1,
        title: b.label,
        instructions: b.notes || `Timebox ~${b.duration_minutes || 30} minutes.`,
        expected_state: 'Checkpoint note added.',
        visual_checks: [],
        common_mistakes: [],
        troubleshooting: [],
        completion_criteria: 'Done or blocker logged.'
      });
    });
  }

  const slug = goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'playbook';

  return {
    id: slug,
    workflow_name: output.plan_title || `${goal} Playbook`,
    category: (input.category as WorkflowCategory) || 'productivity',
    difficulty: 'intermediate',
    estimated_time: '60–120 minutes',
    required_tools: output.tools_needed || [],
    required_materials: [],
    prerequisites: [],
    steps,
    completion_criteria: output.plan_summary,
    report_template: {
      summary: output.plan_summary,
      issues_found: [],
      fixes_made: [],
      recommendations: ['Iterate playbook after first run']
    },
    source_type: 'user-created'
  };
}

export function buildPlan(input: PlanBuilderInput): PlanBuilderOutput {
  const raw = input.raw_goal.trim();
  const goalWithOutcome = [raw, input.desired_outcome || input.context || ''].filter(Boolean).join('. ');
  const augmented = [goalWithOutcome, input.constraints || ''].filter(Boolean).join('. ');
  const facts = extractGoalFacts(goalWithOutcome, input.constraints || '');
  const pattern = inferPattern(goalWithOutcome);
  const work = input.detected_work_type_override || detectWorkType(goalWithOutcome);

  let clarifyingQuestions: string[] = [];
  if (!raw || VAGUE_ONLY.test(raw) || facts.unknowns.length > 0) {
    clarifyingQuestions = ['What are you trying to accomplish and what result would prove progress?'];
  }

  const outcomes = buildUniversalMissions(facts, pattern);
  const brainstorm = buildPossiblePaths(goalWithOutcome, pattern);
  const specificity = scoreSpecificity(augmented, outcomes);
  const base: Omit<PlanBuilderOutput, 'playbook'> = {
    detected_work_type: work,
    detected_intent: 'custom_execution',
    interpreted_goal: facts.desired_outcome,
    plan_title: `${facts.action[0]?.toUpperCase() || 'E'}${facts.action.slice(1)} plan`,
    plan_summary: `Goal-first plan for ${facts.object} with deliverables, execution missions, and proof.`,
    assumptions: facts.constraints.length ? facts.constraints : ['Using practical assumptions from your goal text.'],
    clarifying_questions: clarifyingQuestions,
    extracted_entities: facts.domain_terms,
    extracted_goal_facts: facts,
    execution_pattern: pattern,
    plan_style: inferPlanStyle(pattern),
    possible_paths: brainstorm.paths,
    recommended_path: brainstorm.recommended,
    recommended_path_reason: brainstorm.reason,
    sections: [
      { id: 'deliverables', title: 'Deliverables', items: facts.deliverables },
      { id: 'proof', title: 'Proof signals', items: facts.proof_signals }
    ],
    specificity_score: specificity.score,
    specificity_label: specificity.label,
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    proof_checklist: facts.proof_signals,
    message_templates: pattern === 'sell_or_outreach'
      ? [
          { id: 'm1', label: 'Outreach opener', body: 'Hi [Name] — quick note about [offer]. Want a short quote today?' },
          { id: 'm2', label: 'Follow-up', body: 'Quick follow-up on my last message. Want me to send options?' }
        ]
      : undefined,
    next_move: {
      direct_answer: `Start with the highest-leverage deliverable: ${facts.deliverables[0] || facts.object}.`,
      next_move: outcomes[0]?.title || 'Start first mission',
      go_here: 'Mission 1',
      write_make_do: outcomes[0]?.first_action || 'Write the first concrete step now.',
      proof_needed: outcomes[0]?.proof_required || 'Capture initial proof.',
      avoid: 'Do not switch categories or templates before completing first proof.',
      suggested_action: 'start_focus',
      next_action: outcomes[0]?.first_action || 'Start now.',
      suggested_focus_minutes: 15,
      priority_reason: 'First deliverable unlocks the rest of the plan.',
      drift_warning: ''
    }
  };

  const validation = validatePlanAgainstGoal(augmented, base as PlanBuilderOutput);
  if (!validation.ok) {
    base.plan_summary = `Repaired for relevance: ${base.plan_summary}`;
    base.relevance_score = validation.relevance_score;
    base.relevance_label = validation.relevance_score >= 8 ? 'strong' : validation.relevance_score >= 5 ? 'good' : 'weak';
    base.assumptions = [...base.assumptions, ...validation.issues].slice(0, 4);
    base.daily_outcomes = buildUniversalMissions({ ...facts, deliverables: facts.deliverables.slice(0, 3) }, pattern);
    base.today_missions = (base.daily_outcomes || []).map(toMission);
  } else {
    base.relevance_score = validation.relevance_score;
    base.relevance_label = validation.relevance_score >= 8 ? 'strong' : validation.relevance_score >= 5 ? 'good' : 'weak';
  }

  const result: PlanBuilderOutput = {
    ...base,
    playbook: input.mode === 'playbook' ? workflowFromPlan(input, base) : undefined
  };
  return result;
}

export const PLANNER_REGRESSION_TESTS = [
  'Build a simple at-home hydroponic herb shelf that can grow basil and mint indoors.',
  'grow X account to 20 followers',
  'find new leads for detailing',
  'organize a messy garage into a weekend project workspace',
  'ship one improvement to my SaaS app',
  'make money today',
  'compare 3 tools for recording product demos',
  'fix my Atom S3R screen text'
] as const;

export { WORK_TYPE_LABELS };
