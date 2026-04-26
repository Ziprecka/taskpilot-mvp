import type { AIIntent, AIResponse, Confidence, Workflow, WorkflowSession } from '@/types/workflow';

export const AI_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    workflow_state: {
      type: 'object',
      additionalProperties: false,
      properties: {
        goal: { type: 'string' },
        category: { type: 'string' },
        mode: { type: 'string' },
        current_step: { type: 'number' },
        completed_steps: {
          type: 'array',
          items: { type: 'number' }
        },
        is_complete: { type: 'boolean' },
        confidence: {
          type: 'string',
          enum: ['low', 'medium', 'high']
        }
      },
      required: ['goal', 'category', 'mode', 'current_step', 'completed_steps', 'confidence', 'is_complete']
    },
    ai_source: { type: 'string', enum: ['openai', 'mock'] },
    intent: {
      type: 'string',
      enum: ['next_step', 'question_answer', 'debug', 'check_work', 'explain', 'complete_step', 'complete_workflow', 'general']
    },
    user_facing_response: { type: 'string' },
    direct_answer: { type: 'string' },
    next_action: { type: 'string' },
    needs_input: { type: 'boolean' },
    requested_input: { type: 'string' },
    detected_issues: {
      type: 'array',
      items: { type: 'string' }
    },
    updated_steps: {
      type: 'array',
      items: { type: 'number' }
    },
    completion: {
      type: 'object',
      additionalProperties: false,
      properties: {
        workflow_complete: { type: 'boolean' },
        completion_summary: { type: 'string' },
        completed_at: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        recommended_next_workflow: { type: 'string' }
      },
      required: ['workflow_complete', 'completion_summary', 'completed_at', 'recommended_next_workflow']
    },
    proof_result: {
      type: 'object',
      additionalProperties: false,
      properties: {
        has_proof: { type: 'boolean' },
        proof_sufficient: { type: 'boolean' },
        should_mark_complete: { type: 'boolean' },
        proof_summary: { type: 'string' }
      },
      required: ['has_proof', 'proof_sufficient', 'should_mark_complete', 'proof_summary']
    }
  },
  required: [
    'ai_source',
    'intent',
    'workflow_state',
    'user_facing_response',
    'direct_answer',
    'next_action',
    'needs_input',
    'requested_input',
    'detected_issues',
    'updated_steps',
    'completion',
    'proof_result'
  ]
} as const;

function toConfidence(value: unknown, fallback: Confidence): Confidence {
  return value === 'low' || value === 'medium' || value === 'high' ? value : fallback;
}

function toNumberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is number => typeof item === 'number');
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function normalizeAIResponse(
  raw: unknown,
  fallbackState: {
    goal: string;
    category: string;
    mode: string;
    current_step: number;
    completed_steps: number[];
    confidence: Confidence;
    is_complete: boolean;
    ai_source: 'openai' | 'mock';
    intent: AIIntent;
    next_action: string;
    completion_summary: string;
    recommended_next_workflow: string;
    has_proof: boolean;
  }
): AIResponse {
  try {
    const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const workflowState =
      source.workflow_state && typeof source.workflow_state === 'object'
        ? (source.workflow_state as Record<string, unknown>)
        : {};

    return {
      ai_source: source.ai_source === 'openai' || source.ai_source === 'mock' ? source.ai_source : fallbackState.ai_source,
      intent:
        source.intent === 'next_step' ||
        source.intent === 'question_answer' ||
        source.intent === 'debug' ||
        source.intent === 'check_work' ||
        source.intent === 'explain' ||
        source.intent === 'complete_step' ||
        source.intent === 'complete_workflow' ||
        source.intent === 'general'
          ? source.intent
          : fallbackState.intent,
      workflow_state: {
        goal: typeof workflowState.goal === 'string' ? workflowState.goal : fallbackState.goal,
        category: typeof workflowState.category === 'string' ? workflowState.category : fallbackState.category,
        mode: typeof workflowState.mode === 'string' ? workflowState.mode : fallbackState.mode,
        current_step: typeof workflowState.current_step === 'number' ? workflowState.current_step : fallbackState.current_step,
        completed_steps: toNumberArray(workflowState.completed_steps, fallbackState.completed_steps),
        confidence: toConfidence(workflowState.confidence, fallbackState.confidence),
        is_complete: typeof workflowState.is_complete === 'boolean' ? workflowState.is_complete : fallbackState.is_complete
      },
      user_facing_response:
        typeof source.user_facing_response === 'string' && source.user_facing_response.trim()
          ? source.user_facing_response
          : `Current workflow: ${fallbackState.goal}.`,
      direct_answer:
        typeof source.direct_answer === 'string' && source.direct_answer.trim() ? source.direct_answer : 'Proceed with the workflow using the next action.',
      next_action:
        typeof source.next_action === 'string' && source.next_action.trim()
          ? source.next_action
          : fallbackState.next_action,
      needs_input: Boolean(source.needs_input),
      requested_input: typeof source.requested_input === 'string' ? source.requested_input : '',
      detected_issues: toStringArray(source.detected_issues),
      updated_steps: toNumberArray(source.updated_steps, []),
      completion:
        source.completion && typeof source.completion === 'object'
          ? {
              workflow_complete: Boolean((source.completion as Record<string, unknown>).workflow_complete),
              completion_summary:
                typeof (source.completion as Record<string, unknown>).completion_summary === 'string'
                  ? ((source.completion as Record<string, unknown>).completion_summary as string)
                  : fallbackState.completion_summary,
              completed_at:
                (source.completion as Record<string, unknown>).completed_at === null ||
                typeof (source.completion as Record<string, unknown>).completed_at === 'string'
                  ? (((source.completion as Record<string, unknown>).completed_at as string | null) ?? null)
                  : null,
              recommended_next_workflow:
                typeof (source.completion as Record<string, unknown>).recommended_next_workflow === 'string'
                  ? ((source.completion as Record<string, unknown>).recommended_next_workflow as string)
                  : fallbackState.recommended_next_workflow
            }
          : {
              workflow_complete: fallbackState.is_complete,
              completion_summary: fallbackState.completion_summary,
              completed_at: fallbackState.is_complete ? new Date().toISOString() : null,
              recommended_next_workflow: fallbackState.recommended_next_workflow
            }
      ,
      proof_result:
        source.proof_result && typeof source.proof_result === 'object'
          ? {
              has_proof: Boolean((source.proof_result as Record<string, unknown>).has_proof),
              proof_sufficient: Boolean((source.proof_result as Record<string, unknown>).proof_sufficient),
              should_mark_complete: Boolean((source.proof_result as Record<string, unknown>).should_mark_complete),
              proof_summary:
                typeof (source.proof_result as Record<string, unknown>).proof_summary === 'string'
                  ? ((source.proof_result as Record<string, unknown>).proof_summary as string)
                  : ''
            }
          : {
              has_proof: fallbackState.has_proof,
              proof_sufficient: false,
              should_mark_complete: false,
              proof_summary: ''
            }
    };
  } catch {
    return {
      ai_source: fallbackState.ai_source,
      intent: fallbackState.intent,
      workflow_state: {
        goal: fallbackState.goal,
        category: fallbackState.category,
        mode: fallbackState.mode,
        current_step: fallbackState.current_step,
        completed_steps: fallbackState.completed_steps,
        confidence: fallbackState.confidence,
        is_complete: fallbackState.is_complete
      },
      user_facing_response: `Current workflow: ${fallbackState.goal}.`,
      direct_answer: 'Proceed with the next action.',
      next_action: fallbackState.next_action,
      needs_input: false,
      requested_input: '',
      detected_issues: [],
      updated_steps: [],
      completion: {
        workflow_complete: fallbackState.is_complete,
        completion_summary: fallbackState.completion_summary,
        completed_at: fallbackState.is_complete ? new Date().toISOString() : null,
        recommended_next_workflow: fallbackState.recommended_next_workflow
      },
      proof_result: {
        has_proof: fallbackState.has_proof,
        proof_sufficient: false,
        should_mark_complete: false,
        proof_summary: ''
      }
    };
  }
}

export function detectIntent(message: string, isWorkflowComplete: boolean): AIIntent {
  const normalized = String(message ?? '').toLowerCase();
  if (isWorkflowComplete) return 'complete_workflow';
  if (normalized.includes('what next') || normalized.includes('now what') || normalized === 'next' || normalized.includes('next step')) return 'next_step';
  if (normalized.includes('what is') || normalized.includes('why') || normalized.includes('how does') || normalized.includes('explain')) return 'question_answer';
  if (normalized.includes('error') || normalized.includes('bug') || normalized.includes('debug') || normalized.includes('not working') || normalized.includes('failed')) return 'debug';
  if (normalized.includes('check') || normalized.includes('does this look') || normalized.includes('is this right')) return 'check_work';
  if (normalized.includes('done') || normalized.includes('completed') || normalized.includes('finished this step')) return 'complete_step';
  return 'general';
}

function explainTerm(message: string): string | null {
  const normalized = message.toLowerCase();
  if (normalized.includes('gradle jvm')) return 'Gradle JVM is the Java runtime Gradle uses to execute your build tasks. In IntelliJ, it can differ from Project SDK; mismatches can cause build failures.';
  if (normalized.includes('project sdk')) return 'Project SDK is the JDK IntelliJ uses for code analysis and project-level settings. It should align with your project Java version.';
  if (normalized.includes('openai api')) return 'OpenAI API is the backend service TaskPilot calls to generate workflow-aware responses. It requires OPENAI_API_KEY.';
  if (normalized.includes('supabase')) return 'Supabase is a hosted Postgres platform with auth and APIs, useful for persisting sessions and workflow state.';
  if (normalized.includes('vercel')) return 'Vercel is a deployment platform optimized for Next.js apps, useful for shipping TaskPilot quickly.';
  return null;
}

export function createMockAIResponse(
  message: string,
  workflow?: Workflow,
  session?: Partial<WorkflowSession>,
  contextNotes?: string[]
): AIResponse {
  const normalizedMessage = String(message ?? '').toLowerCase();
  const currentStep = Math.max(1, Number(session?.current_step ?? 1));
  const steps = workflow?.steps ?? [];
  const step = steps.find((item) => item.step_number === currentStep) ?? steps[0];
  const completedSteps = session?.completed_steps ?? [];
  const isComplete = steps.length > 0 && completedSteps.length >= steps.length;
  const intent = detectIntent(message, isComplete);
  const fallbackState = {
    goal: session?.goal ?? workflow?.workflow_name ?? 'Complete workflow',
    category: workflow?.category ?? 'custom',
    mode: session?.mode ?? 'guide',
    current_step: currentStep,
    completed_steps: completedSteps,
    confidence: (session?.confidence ?? 'medium') as Confidence,
    is_complete: isComplete,
    ai_source: 'mock' as const,
    intent,
    next_action: step?.instructions ?? 'Describe your current state and blocker.',
    completion_summary: isComplete ? `Workflow complete for ${workflow?.workflow_name ?? 'workflow'}.` : 'Workflow is in progress.',
    recommended_next_workflow: 'taskpilot-mvp-build'
    ,
    has_proof: Boolean((contextNotes?.length ?? 0) > 0)
  };

  const termExplanation = explainTerm(message);

  if (isComplete) {
    return normalizeAIResponse(
      {
        ai_source: 'mock',
        intent: 'complete_workflow',
        workflow_state: fallbackState,
        user_facing_response: `Workflow complete. You finished ${workflow?.workflow_name ?? 'this workflow'}.`,
        direct_answer: 'All steps are complete. You can generate a report or start the next workflow.',
        next_action: 'Generate a report, save the workflow, or start the next build task.',
        needs_input: false,
        requested_input: '',
        detected_issues: session?.detected_issues ?? [],
        updated_steps: [],
        completion: {
          workflow_complete: true,
          completion_summary: `Workflow complete. ${workflow?.workflow_name ?? 'Workflow'} is finished.`,
          completed_at: new Date().toISOString(),
          recommended_next_workflow: 'taskpilot-mvp-build'
        },
        proof_result: {
          has_proof: fallbackState.has_proof,
          proof_sufficient: true,
          should_mark_complete: false,
          proof_summary: 'Mock Mode: completion inferred from step progress.'
        }
      },
      fallbackState
    );
  }

  if (termExplanation || intent === 'question_answer' || intent === 'explain') {
    return normalizeAIResponse(
      {
        ai_source: 'mock',
        intent: 'question_answer',
        workflow_state: fallbackState,
        user_facing_response: termExplanation ?? 'Here is the direct explanation you asked for.',
        direct_answer: termExplanation ?? `Here is what this means for step ${step?.step_number ?? currentStep}: ${step?.title ?? 'current step'}.`,
        next_action: step?.instructions ?? fallbackState.next_action,
        needs_input: false,
        requested_input: '',
        detected_issues: [],
        updated_steps: [],
        completion: {
          workflow_complete: false,
          completion_summary: 'Workflow is in progress.',
          completed_at: null,
          recommended_next_workflow: 'taskpilot-mvp-build'
        },
        proof_result: {
          has_proof: fallbackState.has_proof,
          proof_sufficient: false,
          should_mark_complete: false,
          proof_summary: 'Mock Mode: visual inspection is limited.'
        }
      },
      fallbackState
    );
  }

  if (normalizedMessage.includes('what next') || intent === 'next_step') {
    return normalizeAIResponse(
      {
        ai_source: 'mock',
        intent: 'next_step',
        workflow_state: fallbackState,
        user_facing_response: `Current workflow: ${workflow?.workflow_name ?? 'Workflow'}. Current step: ${step?.title ?? 'Step 1'}.`,
        direct_answer: `You should execute step ${step?.step_number ?? currentStep}: ${step?.title ?? 'Continue workflow'}.`,
        next_action: step?.instructions ?? fallbackState.next_action,
        needs_input: false,
        requested_input: '',
        detected_issues: [],
        updated_steps: [],
        completion: {
          workflow_complete: false,
          completion_summary: 'Workflow is in progress.',
          completed_at: null,
          recommended_next_workflow: 'taskpilot-mvp-build'
        }
      },
      fallbackState
    );
  }

  if (normalizedMessage.includes('check') || intent === 'check_work') {
    return normalizeAIResponse(
      {
        ai_source: 'mock',
        intent: 'check_work',
        workflow_state: fallbackState,
        user_facing_response: 'I can check your work. Share a screenshot, photo, or concrete proof from your latest step.',
        direct_answer: fallbackState.has_proof
          ? 'I see proof was uploaded, but Mock Mode cannot truly inspect the image. Based on filename/context, verify expected state now.'
          : 'I need proof to evaluate correctness.',
        next_action: 'Upload proof or paste visible output so I can validate this step.',
        needs_input: true,
        requested_input: 'Screenshot/photo/proof from the current step.',
        detected_issues: contextNotes?.length ? [] : ['No proof provided yet.'],
        updated_steps: [],
        completion: {
          workflow_complete: false,
          completion_summary: 'Workflow is in progress.',
          completed_at: null,
          recommended_next_workflow: 'taskpilot-mvp-build'
        },
        proof_result: {
          has_proof: fallbackState.has_proof,
          proof_sufficient: false,
          should_mark_complete: false,
          proof_summary: fallbackState.has_proof
            ? 'Mock Mode cannot truly inspect images. Visual inspection is limited.'
            : 'No proof provided yet.'
        }
      },
      fallbackState
    );
  }

  if (normalizedMessage.includes('debug') || intent === 'debug') {
    return normalizeAIResponse(
      {
        ai_source: 'mock',
        intent: 'debug',
        workflow_state: fallbackState,
        user_facing_response: 'I can debug this with you. Share the exact error text or log output first.',
        direct_answer: 'To debug accurately, I need the exact error/log and when it happens.',
        next_action: 'Paste the full error/log and what you tried just before the failure.',
        needs_input: true,
        requested_input: 'Exact error, stack trace, or terminal output.',
        detected_issues: ['Missing exact debug evidence.'],
        updated_steps: [],
        completion: {
          workflow_complete: false,
          completion_summary: 'Workflow is in progress.',
          completed_at: null,
          recommended_next_workflow: 'taskpilot-mvp-build'
        },
        proof_result: {
          has_proof: fallbackState.has_proof,
          proof_sufficient: false,
          should_mark_complete: false,
          proof_summary: ''
        }
      },
      fallbackState
    );
  }

  return normalizeAIResponse(
    {
      ai_source: 'mock',
      intent: 'general',
      workflow_state: fallbackState,
      user_facing_response: `You are on step ${step?.step_number ?? currentStep}: ${step?.title ?? 'Continue workflow'}.`,
      direct_answer: 'Use the next action to keep progress moving.',
      next_action: step?.instructions ?? fallbackState.next_action,
      needs_input: false,
      requested_input: '',
      detected_issues: [],
      updated_steps: [],
      completion: {
        workflow_complete: false,
        completion_summary: 'Workflow is in progress.',
        completed_at: null,
        recommended_next_workflow: 'taskpilot-mvp-build'
        },
        proof_result: {
          has_proof: fallbackState.has_proof,
          proof_sufficient: false,
          should_mark_complete: false,
          proof_summary: ''
        }
    },
    fallbackState
  );
}
