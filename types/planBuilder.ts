import type { DailyAIResponse, DailyOutcome, Workflow } from '@/types/workflow';

/** Work-type-aware planning for Today + Playbooks */
export type DetectedWorkType =
  | 'service_business_day'
  | 'sales_outreach_day'
  | 'app_build_day'
  | 'hardware_setup_day'
  | 'research_day'
  | 'admin_cleanup_day'
  | 'learning_day'
  | 'personal_day'
  | 'generic_productivity';

export type PlanBuilderMode = 'daily_execution' | 'playbook';

export type PlanTimeHorizon = 'today' | 'tomorrow' | 'this_week' | 'repeatable';

export type ProofPreference = 'photo' | 'screenshot' | 'document' | 'message' | 'mixed';

export type PlanBuilderInput = {
  raw_goal: string;
  mode: PlanBuilderMode;
  category: string;
  time_horizon: PlanTimeHorizon;
  context?: string;
  constraints?: string;
  proof_preference?: ProofPreference;
  /** When user overrides auto-detection */
  detected_work_type_override?: DetectedWorkType | null;
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
  plan_title: string;
  plan_summary: string;
  assumptions: string[];
  clarifying_questions: string[];
  daily_outcomes?: DailyOutcome[];
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
  next_move: DailyNextMoveResponse;
};
