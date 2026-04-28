import type { DailyAIResponse, DailyOutcome, Workflow } from '@/types/workflow';

/** Work-type-aware planning for Today + Playbooks */
export type DetectedWorkType =
  | 'service_day'
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
  context?: string;
  constraints?: string;
  proof_preference?: ProofPreference;
  /** When user overrides auto-detection */
  detected_work_type_override?: DetectedWorkType | null;
};

export type PlannerSpecificity = 'weak' | 'good' | 'strong';

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
  plan_title: string;
  plan_summary: string;
  assumptions: string[];
  clarifying_questions: string[];
  sections?: Array<{ id: string; title: string; items: string[] }>;
  specificity_score?: number;
  specificity_label?: PlannerSpecificity;
  generated_from_test_prompt?: boolean;
  extracted_entities?: string[];
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
  next_move: DailyNextMoveResponse;
};
