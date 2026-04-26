export type WorkflowMode = 'guide' | 'check' | 'debug' | 'research' | 'train' | 'report';
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
  instructions: string;
  expected_state: string;
  visual_checks: string[];
  common_mistakes: string[];
  troubleshooting: string[];
  completion_criteria: string;
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
    usability_score: number;
    missing_details: string[];
    improvement_suggestions: string[];
  };
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
  status: 'planned' | 'active' | 'done' | 'blocked' | 'skipped';
  estimated_minutes: number;
  actual_minutes: number;
  proof_required: string;
  proof_provided: string;
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
    | 'started_focus'
    | 'completed_action'
    | 'blocked'
    | 'drift_detected'
    | 'proof_added'
    | 'completed_outcome'
    | 'report_generated';
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
}

export interface DailyAIResponse {
  direct_answer: string;
  next_action: string;
  proof_needed: string;
  suggested_focus_minutes: number;
  drift_warning: string;
  priority_reason: string;
  updated_outcome_status?: string;
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
