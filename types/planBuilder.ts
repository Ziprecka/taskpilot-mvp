import type { DailyAIResponse, DailyOutcome, Workflow } from '@/types/workflow';

/** Work-type-aware planning for Today + Playbooks */
export type DetectedWorkType =
  | 'service_day'
  | 'service_business_sales'
  | 'client_work_day'
  | 'sales_day'
  | 'hardware_setup'
  | 'app_build'
  | 'research'
  | 'admin'
  | 'learning'
  | 'personal'
  | 'custom';

export type PlanBuilderMode = 'daily_execution' | 'playbook';

export type PlanTimeHorizon = 'today' | 'tomorrow' | 'this_week' | 'repeatable';

export type ProofPreference = 'photo' | 'screenshot' | 'document' | 'message' | 'mixed';

export type PlanBuilderInput = {
  raw_goal: string;
  mode: PlanBuilderMode;
  category: string;
  time_horizon: PlanTimeHorizon;
  desired_outcome?: string;
  context?: string;
  user_context?: string;
  constraints?: string;
  proof_preference?: ProofPreference;
  /** When user overrides auto-detection */
  detected_work_type_override?: DetectedWorkType | null;
  /** Explicitly force selected category even when conflicting */
  apply_selected_category_anyway?: boolean;
};

export type PlannerSpecificity = 'weak' | 'good' | 'strong';
export type ExecutionPattern =
  | 'create_or_build'
  | 'sell_or_outreach'
  | 'organize_or_clean'
  | 'research_or_decide'
  | 'learn_or_practice'
  | 'fix_or_debug'
  | 'prepare_or_plan'
  | 'publish_or_grow'
  | 'admin_or_recover'
  | 'health_or_personal';

export type PlanStyle = 'Fast win' | 'Deep work' | 'Money-focused' | 'Build-ready' | 'Learning';

export type GoalFacts = {
  object: string;
  action: string;
  desired_outcome: string;
  timeframe?: string;
  constraints: string[];
  deliverables: string[];
  proof_signals: string[];
  tools: string[];
  domain_terms: string[];
  unknowns: string[];
};

export type GoalIntent =
  | 'service_day'
  | 'service_business_sales'
  | 'social_growth'
  | 'workspace_organization'
  | 'home_project'
  | 'saas_build'
  | 'electronics_project'
  | 'hardware_debug'
  | 'robotics_project'
  | 'content_creation'
  | 'research_project'
  | 'learning_plan'
  | 'admin_cleanup'
  | 'finance_recovery'
  | 'personal_health'
  | 'custom_execution';

export type GoalIntentDetection = {
  intent: GoalIntent;
  confidence: number;
  selected_category: string;
  category_conflict: boolean;
  reason: string;
  extracted_entities: string[];
  extracted_actions: string[];
  extracted_constraints: string[];
  missing_info: string[];
};

export type TodayMission = {
  title: string;
  objective: string;
  first_action: string;
  checklist: string[];
  proof_required: string;
  estimated_minutes: number;
  risk: string;
  done_when: string;
  category: string;
  leverage_score: number;
  money_potential: 'low' | 'medium' | 'high';
  short_title?: string;
};

export type ScheduleBlock = {
  id: string;
  label: string;
  start_hint?: string;
  duration_minutes?: number;
  notes?: string;
};

export type MessageTemplate = {
  id: string;
  label: string;
  body: string;
};

export type RiskPlanItem = {
  risk: string;
  mitigation: string;
};

/** Shape compatible with Daily coach card / Next Move */
export type DailyNextMoveResponse = Pick<
  DailyAIResponse,
  | 'direct_answer'
  | 'next_move'
  | 'go_here'
  | 'write_make_do'
  | 'proof_needed'
  | 'avoid'
  | 'suggested_action'
  | 'next_action'
  | 'suggested_focus_minutes'
  | 'priority_reason'
  | 'drift_warning'
>;

export type PlanBuilderOutput = {
  detected_work_type: DetectedWorkType;
  detected_intent?: GoalIntent;
  intent_conflict?: boolean;
  conflict_reason?: string;
  interpreted_goal?: string;
  confidence?: 'low' | 'medium' | 'high';
  plan_title: string;
  plan_summary: string;
  assumptions: string[];
  clarifying_questions: string[];
  sections?: Array<{ id: string; title: string; items: string[] }>;
  specificity_score?: number;
  specificity_label?: PlannerSpecificity;
  relevance_score?: number;
  relevance_label?: PlannerSpecificity;
  generated_from_test_prompt?: boolean;
  extracted_entities?: string[];
  extracted_goal_facts?: GoalFacts;
  execution_pattern?: ExecutionPattern;
  plan_style?: PlanStyle;
  possible_paths?: string[];
  recommended_path?: string;
  recommended_path_reason?: string;
  daily_outcomes?: DailyOutcome[];
  today_missions?: TodayMission[];
  playbook?: Workflow;
  schedule_blocks?: ScheduleBlock[];
  proof_checklist?: string[];
  message_templates?: MessageTemplate[];
  risk_plan?: RiskPlanItem[];
  /** Likely files/components for build days */
  likely_artifacts?: string[];
  /** Prospect tracker column hints */
  prospect_columns?: string[];
  success_metrics?: string[];
  tools_needed?: string[];
  debug_checklist?: string[];
  copilot_seed?: {
    next_action: string;
    draft_assets: string[];
    likely_blockers: string[];
  };
  next_move: DailyNextMoveResponse;
};
