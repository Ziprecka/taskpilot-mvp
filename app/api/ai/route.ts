import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { TASKPILOT_SYSTEM_PROMPT } from '@/lib/prompts';
import { AI_RESPONSE_SCHEMA, createMockAIResponse, detectIntent, normalizeAIResponse } from '@/lib/aiSchema';
import { getServerEnvStatus } from '@/lib/env';
import type { Workflow, WorkflowSession } from '@/types/workflow';

export async function POST(req: NextRequest) {
  let parsedBody: any = null;
  const env = getServerEnvStatus();
  const openai = getOpenAIClient();
  try {
    parsedBody = await req.json();
    const message = String(parsedBody?.message ?? '');
    const workflow = (parsedBody?.workflow ?? undefined) as Workflow | undefined;
    const session = (parsedBody?.session ?? undefined) as Partial<WorkflowSession> | undefined;
    const mode = String(parsedBody?.mode ?? session?.mode ?? 'guide');
    const currentStep = Number(parsedBody?.currentStep ?? session?.current_step ?? 1);
    const contextNotes = Array.isArray(parsedBody?.contextNotes)
      ? parsedBody.contextNotes.filter((item: unknown): item is string => typeof item === 'string')
      : [];
    const uploads = Array.isArray(parsedBody?.uploads)
      ? parsedBody.uploads.filter((item: unknown) => item && typeof item === 'object').slice(0, 5)
      : [];
    const allSteps = Array.isArray(workflow?.steps) ? workflow.steps : [];
    const completedSteps = Array.isArray(session?.completed_steps) ? session.completed_steps : [];
    const isComplete = allSteps.length > 0 && completedSteps.length >= allSteps.length;
    const intent = detectIntent(message, isComplete);
    const fallbackState = {
      goal: session?.goal ?? workflow?.workflow_name ?? 'Complete workflow',
      category: workflow?.category ?? 'custom',
      mode,
      current_step: Number.isFinite(currentStep) && currentStep > 0 ? currentStep : 1,
      completed_steps: completedSteps,
      confidence: session?.confidence ?? 'medium',
      is_complete: isComplete,
      ai_source: 'openai' as const,
      intent,
      next_action:
        workflow?.steps?.find((step) => step.step_number === currentStep)?.instructions ??
        workflow?.steps?.[0]?.instructions ??
        'Describe your current state and blocker.',
      completion_summary: isComplete ? `Workflow complete for ${workflow?.workflow_name ?? 'workflow'}.` : 'Workflow is in progress.',
      recommended_next_workflow: 'taskpilot-mvp-build'
      ,
      has_proof: uploads.length > 0 || contextNotes.length > 0
    } as const;

    const requestPayload = {
      message,
      goal: session?.goal ?? workflow?.workflow_name ?? 'Complete workflow',
      sessionStatus: session?.status ?? 'active',
      mode,
      currentStep: fallbackState.current_step,
      allSteps,
      completedSteps,
      notes: contextNotes,
      uploads,
      uploadSummaries: uploads.map((upload: any) => ({
        name: String(upload?.name ?? ''),
        type: String(upload?.type ?? ''),
        description: String(upload?.description ?? '')
      })),
      workflowContext: {
        workflow_name: workflow?.workflow_name ?? 'Custom workflow',
        workflow_goal: session?.goal ?? workflow?.workflow_name ?? 'Complete workflow',
        category: workflow?.category ?? 'custom',
        mode,
        current_step_title: workflow?.steps?.find((step) => step.step_number === fallbackState.current_step)?.title ?? 'Step',
        current_step_instructions:
          workflow?.steps?.find((step) => step.step_number === fallbackState.current_step)?.instructions ??
          'Describe your current state.',
        expected_state:
          workflow?.steps?.find((step) => step.step_number === fallbackState.current_step)?.expected_state ??
          '',
        common_mistakes:
          workflow?.steps?.find((step) => step.step_number === fallbackState.current_step)?.common_mistakes ??
          [],
        completed_steps: completedSteps,
        remaining_steps: allSteps.filter((step) => !completedSteps.includes(step.step_number))
      },
      workflow,
      session,
      contextNotes,
      recentMessages: parsedBody?.recentMessages ?? []
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[TaskPilot][ai] hasOpenAIKey:', env.hasOpenAIKey);
      console.log('[TaskPilot][ai] callingOpenAI:', Boolean(openai));
    }

    if (!openai) {
      const mock = createMockAIResponse(
        message,
        workflow,
        session,
        [...contextNotes, ...uploads.map((upload: any) => `upload:${String(upload?.name ?? 'image')}`)]
      );
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TaskPilot][ai] openaiSuccess: false');
        console.log('[TaskPilot][ai] fallbackToMock: true');
      }
      return NextResponse.json(mock);
    }

    const userContent: Array<{ type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'auto' | 'low' }> = [
      { type: 'input_text', text: JSON.stringify(requestPayload) }
    ];
    for (const upload of uploads) {
      if (typeof upload?.dataUrl === 'string' && upload.dataUrl.startsWith('data:image/')) {
        userContent.push({ type: 'input_image', image_url: upload.dataUrl, detail: 'auto' });
      }
    }

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: TASKPILOT_SYSTEM_PROMPT }]
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'taskpilot_ai_response',
          schema: AI_RESPONSE_SCHEMA,
          strict: true
        }
      }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[TaskPilot][ai] openaiSuccess: true');
      console.log('[TaskPilot][ai] fallbackToMock: false');
    }
    const rawText =
      response.output_text ||
      response.output
        ?.flatMap((outputItem) => ('content' in outputItem && Array.isArray(outputItem.content) ? outputItem.content : []))
        .map((contentItem) => ('text' in contentItem && typeof contentItem.text === 'string' ? contentItem.text : ''))
        .join('\n') ||
      '';

    if (process.env.NODE_ENV !== 'production') {
      console.log('[TaskPilot][ai] raw model response:', rawText);
    }

    let parsedRaw: unknown = null;
    try {
      parsedRaw = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsedRaw = null;
    }
    const normalized = normalizeAIResponse(parsedRaw, fallbackState);
    normalized.ai_source = 'openai';

    if (process.env.NODE_ENV !== 'production') {
      console.log('[TaskPilot][ai] normalized response:', normalized);
    }

    return NextResponse.json(normalized);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[TaskPilot][ai] error:', error);
    }
    const fallback = createMockAIResponse(
      String(parsedBody?.message ?? 'what next'),
      parsedBody?.workflow,
      parsedBody?.session,
      [...(parsedBody?.contextNotes ?? []), ...((parsedBody?.uploads ?? []).map((upload: any) => `upload:${String(upload?.name ?? 'image')}`))]
    );
    if (process.env.NODE_ENV !== 'production') {
      console.log('[TaskPilot][ai] openaiSuccess: false');
      console.log('[TaskPilot][ai] fallbackToMock: true');
      console.error('[TaskPilot][ai] errorMessage:', error instanceof Error ? error.message : 'unknown_error');
    }
    return NextResponse.json(
      process.env.NODE_ENV !== 'production'
        ? { ...fallback, error_debug: error instanceof Error ? error.message : 'unknown_error' }
        : fallback
    );
  }
}