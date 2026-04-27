export type WorkflowMode =
  | 'guide'
  | 'check'
  | 'debug'
  | 'research'
  | 'train'
  | 'report'
  | 'guided'
  | 'fast_checklist'
  | 'proof'
  | 'robot';
export type WorkflowCategory =
  | 'electronics'
  | 'coding'
  | 'research'
  | '3d-printing'
  | '3d_printing'
  | 'business_sop'
  | 'productivity'
  | 'deployment'
  | 'custom';
export type Confidence = 'low' | 'medium' | 'high';

export interface WorkflowStep {
  step_number: number;
  title: string;
  objective?: string;
  instructions: string;
  expected_state: string;
  proof_required?: string;
  visual_checks: string[];
  common_mistakes: string[];
  troubleshooting: string[];
  completion_criteria: string;
  estimated_minutes?: number;
  ai_check_prompt?: string;
}

export interface Workflow {
  id: string;
  workflow_name: string;
  category: WorkflowCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  required_tools: string[];
  required_materials: string[];
  prerequisites: string[];
  steps: WorkflowStep[];
  completion_criteria: string;
  report_template: {
    summary: string;
    issues_found: string[];
    fixes_made: string[];
    recommendations: string[];
  };
  generation_quality?: {
    specificity_score: number;
    actionability_score?: number;
    verifiability_score?: number;
    estimated_usefulness_score?: number;
    usability_score: number;
    missing_details: string[];
    improvement_suggestions: string[];
  };
  success_definition?: string;
  failure_conditions?: string[];
  verification_plan?: string[];
  source_type?: 'starter' | 'generated' | 'user-created' | 'imported' | 'internal/example';
  library_state?: 'active' | 'archived' | 'deleted/local-hidden';
  last_started_at?: string | null;
}

export interface WorkflowSession {
  id: string;
  workflow_id: string;
  goal: string;
  mode: WorkflowMode;
  current_step: number;
  completed_steps: number[];
  detected_issues: string[];
  confidence: Confidence;
  status: 'active' | 'blocked' | 'complete';
  started_at: string;
  uploads: SessionUpload[];
  notes: SessionNote[];
  proof_status_by_step?: Record<string, 'not_required' | 'required_missing' | 'submitted' | 'accepted' | 'overridden'>;
}

export interface SessionUpload {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  created_at: string;
  description?: string;
}

export interface SessionNote {
  id: string;
  content: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  ai_response?: Partial<AIResponse>;
}

export interface WorkflowReport {
  workflow_name: string;
  goal: string;
  completed_steps: number[];
  issues_found: string[];
  session_notes: string[];
  summary: string;
  next_recommendations: string[];
  created_at: string;
}

export interface TaskPilotSessionState {
  session_id: string;
  workflow_slug: string;
  workflow_name: string;
  goal: string;
  mode: string;
  status: 'active' | 'blocked' | 'complete';
  current_step: number;
  completed_steps: number[];
  ai_next_action: string;
  detected_issues: string[];
  confidence: Confidence;
  notes: SessionNote[];
  uploads: SessionUpload[];
  messages: ChatMessage[];
  report: WorkflowReport | null;
  ai_source: 'openai' | 'mock';
  sync_status: 'local' | 'syncing' | 'synced' | 'error';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DailyOutcome {
  id: string;
  title: string;
  why_it_matters: string;
  category: 'money' | 'build' | 'marketing' | 'learning' | 'admin' | 'health' | 'other';
  priority: 1 | 2 | 3;
  status: 'planned' | 'selected' | 'active' | 'done' | 'blocked' | 'skipped';
  estimated_minutes: number;
  actual_minutes: number;
  proof_required: string;
  proof_provided: string;
  first_action?: string;
  value_score?: number;
  quality_score?: number;
  leverage_score?: number;
  money_potential?: 'none' | 'low' | 'medium' | 'high';
  urgency?: 'low' | 'medium' | 'high';
  effort?: 'low' | 'medium' | 'high';
  blocker_note?: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface FocusBlock {
  id: string;
  outcome_id: string;
  title: string;
  status: 'active' | 'paused' | 'complete' | 'blocked';
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  actual_minutes: number;
  current_action: string;
  blocker: string;
  drift_score: number;
  last_progress_at: string;
}

export interface DailyEvent {
  id: string;
  type:
    | 'created_outcome'
    | 'generated_top3'
    | 'started_focus'
    | 'completed_action'
    | 'blocked'
    | 'blocker_resolved'
    | 'drift_detected'
    | 'proof_added'
    | 'completed_outcome'
    | 'report_generated'
    | 'coach_message_sent'
    | 'carry_over';
  content: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  date: string;
  completed_outcomes: DailyOutcome[];
  blocked_outcomes: DailyOutcome[];
  skipped_outcomes: DailyOutcome[];
  total_focus_minutes: number;
  summary: string;
  wins: string[];
  leaks: string[];
  tomorrow_first_action: string;
  money_score: number;
  execution_score: number;
  created_at: string;
  reflections?: {
    moved_forward: string;
    proof_created: string;
    time_leak: string;
    repeat: string;
    avoid: string;
    tomorrow_first_move: string;
  };
  lessons_captured?: number;
}

export interface DailyDebrief {
  id: string;
  date: string;
  summary: string;
  completed_outcomes: string[];
  unfinished_outcomes: string[];
  proof_logged: string[];
  focus_minutes: number;
  xp_earned: number;
  biggest_win: string;
  biggest_leak: string;
  lesson_learned: string;
  tomorrow_first_move: string;
  carry_forward: string[];
  execution_score: number;
  money_score: number;
  created_at: string;
}

export interface DailyAIResponse {
  direct_answer: string;
  next_move?: string;
  go_here?: string;
  write_make_do?: string;
  confidence?: 'low' | 'medium' | 'high';
  suggested_action?: 'start_focus' | 'log_proof' | 'mark_done' | 'create_workflow' | 'close_day' | 'ask_clarifying_question' | 'none';
  clarifying_question?: string;
  headline?: string;
  do_now?: string;
  steps?: string[];
  why_it_matters?: string;
  avoid?: string;
  timebox_minutes?: number;
  action_buttons?: Array<{ label: string; action: 'start_focus' | 'log_proof' | 'mark_done' | 'create_workflow' | 'close_day' | 'none' }>;
  current_state_read?: string;
  recommended_outcome_id?: string | null;
  next_action: string;
  proof_needed: string;
  suggested_focus_minutes: number;
  focus_minutes?: number;
  should_start_focus?: boolean;
  should_mark_done?: boolean;
  should_create_workflow?: boolean;
  drift_warning: string;
  priority_reason: string;
  suggested_outcome_update?: string;
  updated_outcome_status?: string;
  generated_outcomes?: string[];
}

export interface DailyCoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  ai?: DailyAIResponse;
}

export type DailyCommandState = {
  date: string;
  status: 'planning' | 'focus' | 'blocked' | 'complete';
  selected_day_type: 'build' | 'money' | 'admin' | 'learning' | 'personal' | 'custom' | null;
  custom_context: string;
  outcomes: DailyOutcome[];
  active_outcome_id: string | null;
  active_focus_block: FocusBlock | null;
  events: DailyEvent[];
  coach_messages: DailyCoachMessage[];
  report: DailyReport | null;
  debrief?: DailyDebrief | null;
  closed_xp_awarded?: boolean;
  xp_today?: number;
  proof_count_today?: number;
  proof_items?: DailyProofItem[];
  lessons?: LearningCard[];
  last_saved_at: string;
};

export interface UserProgression {
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  completed_outcomes_total: number;
  proof_logged_total: number;
  reports_generated_total: number;
  last_active_date: string | null;
}

export interface DailyProofItem {
  id: string;
  outcome_id: string;
  type: 'screenshot' | 'photo' | 'link' | 'text' | 'file';
  note: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  data_url?: string;
  created_at: string;
}

export interface LearningCard {
  id: string;
  lesson_title: string;
  summary: string;
  mistake_or_blocker: string;
  principle: string;
  next_time_action: string;
  source_type: 'daily_outcome' | 'workflow_step';
  source_id: string;
  created_at: string;
}

export type AIIntent =
  | 'next_step'
  | 'question_answer'
  | 'debug'
  | 'check_work'
  | 'explain'
  | 'complete_step'
  | 'complete_workflow'
  | 'general';

export interface AIResponse {
  ai_source: 'openai' | 'mock';
  intent: AIIntent;
  workflow_state: {
    goal: string;
    category: string;
    mode: string;
    current_step: number;
    completed_steps: number[];
    confidence: Confidence;
    is_complete: boolean;
  };
  user_facing_response: string;
  direct_answer: string;
  next_action: string;
  needs_input: boolean;
  requested_input: string;
  detected_issues: string[];
  updated_steps: number[];
  completion: {
    workflow_complete: boolean;
    completion_summary: string;
    completed_at: string | null;
    recommended_next_workflow: string;
  };
  proof_result: {
    has_proof: boolean;
    proof_sufficient: boolean;
    should_mark_complete: boolean;
    proof_summary: string;
  };
}
