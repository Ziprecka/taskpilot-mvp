'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { StepTracker } from '@/components/StepTracker';
import { CurrentStepCard } from '@/components/CurrentStepCard';
import { AIChatPanel } from '@/components/AIChatPanel';
import { ModeSelector } from '@/components/ModeSelector';
import { UploadPanel } from '@/components/UploadPanel';
import { getWorkflowById } from '@/data/sampleWorkflows';
import { clampNotes, clampUploads, getGeneratedWorkflowsStorageKey, getSessionStorageKey } from '@/lib/storage';
import { loadSessionFromSupabase, saveNote, saveReport, saveSessionState, saveUpload, syncSessionToSupabase, toCanonicalSessionState } from '@/lib/sessionPersistence';
import type { AIResponse, ChatMessage, SessionNote, SessionUpload, TaskPilotSessionState, WorkflowMode, WorkflowSession } from '@/types/workflow';

interface SessionReport {
  workflow_name: string;
  goal: string;
  completed_steps: number[];
  issues_found: string[];
  session_notes: string[];
  summary: string;
  what_changed: string[];
  remaining_blockers: string[];
  next_five_actions: string[];
  robot_readiness_score: number;
  next_recommendations: string[];
  created_at: string;
}

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const savedSessionId = search.get('sid');
  const [workflow, setWorkflow] = useState(() => getWorkflowById(params.id));
  const storageKey = getSessionStorageKey(savedSessionId || params.id);
  const [session, setSession] = useState<WorkflowSession>({
    id: savedSessionId || `local-session-${params.id}`,
    workflow_id: workflow.id,
    goal: search.get('goal') ?? workflow.workflow_name,
    mode: (search.get('mode') as WorkflowMode) || 'guide',
    current_step: 1,
    completed_steps: [],
    detected_issues: [],
    confidence: 'medium',
    status: 'active',
    started_at: new Date().toISOString(),
    uploads: [],
    notes: []
  });
  const [uploads, setUploads] = useState<SessionUpload[]>([]);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [latestAIResponse, setLatestAIResponse] = useState<Partial<AIResponse> | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [systemNotice, setSystemNotice] = useState<string>('');
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [syncState, setSyncState] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [syncErrorDetail, setSyncErrorDetail] = useState<string>('');
  const [lastSavedAt, setLastSavedAt] = useState<string>(new Date().toISOString());
  const [mobileTab, setMobileTab] = useState<'step' | 'ai' | 'proof' | 'tracker'>('step');
  const [showFullGoal, setShowFullGoal] = useState(false);

  useEffect(() => {
    setWorkflow(getWorkflowById(params.id));
    try {
      const raw = localStorage.getItem(getGeneratedWorkflowsStorageKey());
      if (!raw) return;
      const generated = JSON.parse(raw);
      if (!Array.isArray(generated)) return;
      const matched = generated.find((item: any) => item?.id === params.id);
      if (matched) setWorkflow(matched);
    } catch {
      // ignore invalid local workflow cache
    }
  }, [params.id]);

  const currentStep = workflow.steps.find((step) => step.step_number === session.current_step) ?? workflow.steps[0];
  const isWorkflowComplete = session.status === 'complete' || session.completed_steps.length >= workflow.steps.length;
  const hasCurrentProof = uploads.length > 0 || notes.length > 0;
  const proofStatusByStep: Record<string, 'not_required' | 'required_missing' | 'submitted' | 'accepted' | 'overridden'> =
    workflow.steps.reduce((acc, step) => {
      if (!step.proof_required) acc[String(step.step_number)] = 'not_required';
      else if (session.completed_steps.includes(step.step_number)) acc[String(step.step_number)] = hasCurrentProof ? 'accepted' : 'overridden';
      else acc[String(step.step_number)] = hasCurrentProof ? 'submitted' : 'required_missing';
      return acc;
    }, {} as Record<string, 'not_required' | 'required_missing' | 'submitted' | 'accepted' | 'overridden'>);

  function restoreFromLocal() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return false;
      const parsed = JSON.parse(saved) as {
        session?: WorkflowSession;
        uploads?: SessionUpload[];
        notes?: SessionNote[];
        latestAIResponse?: Partial<AIResponse> | null;
        report?: SessionReport | null;
      };
      if (parsed.session) setSession(parsed.session);
      if (Array.isArray(parsed.uploads)) setUploads(parsed.uploads);
      if (Array.isArray(parsed.notes)) setNotes(parsed.notes);
      if (parsed.latestAIResponse) setLatestAIResponse(parsed.latestAIResponse);
      if (parsed.report) setReport(parsed.report);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TaskPilot][persist] session loaded from: localStorage');
        console.log('[TaskPilot][persist] current_step restored:', parsed.session?.current_step);
        console.log('[TaskPilot][persist] completed_steps restored:', parsed.session?.completed_steps);
      }
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!envStatus?.supabaseEnabled) {
      const loaded = restoreFromLocal();
      if (!loaded && process.env.NODE_ENV !== 'production') console.log('[TaskPilot][persist] session loaded from: fresh');
    }
  }, [storageKey, envStatus?.supabaseEnabled]);

  useEffect(() => {
    const state = {
      session: { ...session, uploads, notes },
      uploads,
      notes,
      latestAIResponse,
      report
    };
    saveSessionState(savedSessionId || params.id, state);
    localStorage.setItem(storageKey, JSON.stringify(state));
    setLastSavedAt(new Date().toISOString());
    if (process.env.NODE_ENV !== 'production') {
      console.log('[TaskPilot][persist] current_step saved:', session.current_step);
      console.log('[TaskPilot][persist] completed_steps saved:', session.completed_steps);
    }
  }, [session, uploads, notes, latestAIResponse, report, storageKey, savedSessionId, params.id]);

  useEffect(() => {
    void fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setEnvStatus(data?.env ?? null);
        if (data?.env?.supabaseEnabled) {
          setSyncState('syncing');
          void loadSessionFromSupabase(savedSessionId || undefined, savedSessionId ? undefined : params.id)
            .then((payload) => {
              if (payload?.ok && payload?.data) {
                setSession((prev) => ({
                  ...prev,
                  id: payload.data.id ?? prev.id,
                  current_step: payload.data.current_step ?? prev.current_step,
                  completed_steps: payload.data.completed_steps ?? prev.completed_steps,
                  status: payload.data.status ?? prev.status,
                  confidence: payload.data.confidence ?? prev.confidence,
                  detected_issues: payload.data.detected_issues ?? prev.detected_issues,
                  goal: payload.data.goal ?? prev.goal,
                  mode: payload.data.mode ?? prev.mode
                }));
                setSyncState('synced');
                if (process.env.NODE_ENV !== 'production') {
                  console.log('[TaskPilot][persist] current_step restored:', payload.data.current_step);
                  console.log('[TaskPilot][persist] completed_steps restored:', payload.data.completed_steps);
                }
              } else {
                restoreFromLocal();
                setSyncState('error');
                setSyncErrorDetail(payload?.error || payload?.reason || 'No Supabase session row found.');
              }
            })
            .catch((error) => {
              restoreFromLocal();
              setSyncState('error');
              setSyncErrorDetail(error instanceof Error ? error.message : 'unknown_error');
            });
        } else {
          restoreFromLocal();
        }
      })
      .catch(() => null);
  }, [params.id, savedSessionId]);

  useEffect(() => {
    if (!envStatus?.supabaseEnabled) return;
    const timer = setTimeout(() => {
      setSyncState('syncing');
      void syncSessionToSupabase(session.id, {
        workflow_slug: canonicalState.workflow_slug,
        goal: canonicalState.goal,
        mode: canonicalState.mode,
        status: canonicalState.status,
        current_step: canonicalState.current_step,
        completed_steps: canonicalState.completed_steps,
        detected_issues: canonicalState.detected_issues,
        ai_next_action: canonicalState.ai_next_action,
        ai_source: canonicalState.ai_source,
        confidence: canonicalState.confidence,
        started_at: canonicalState.created_at,
        completed_at: canonicalState.completed_at,
        updated_at: canonicalState.updated_at
      })
        .then((res) => {
          if (res.ok) {
            setSyncState('synced');
            setSyncErrorDetail('');
            return;
          }
          setSyncState('error');
          setSyncErrorDetail('Auto sync failed at /api/db/session.');
        })
        .catch((error) => {
          setSyncState('error');
          setSyncErrorDetail(error instanceof Error ? error.message : 'Auto sync error');
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [
    envStatus?.supabaseEnabled,
    session.current_step,
    session.completed_steps,
    session.status,
    session.goal,
    session.mode,
    session.detected_issues,
    latestAIResponse?.next_action,
    latestAIResponse?.ai_source
  ]);

  function completeStep() {
    setSession((prev) => {
      const completed = Array.from(new Set([...prev.completed_steps, prev.current_step]));
      const nextIncomplete = workflow.steps.find((step) => !completed.includes(step.step_number))?.step_number ?? workflow.steps.length;
      const complete = completed.length >= workflow.steps.length;
      const nextStepTitle = workflow.steps.find((step) => step.step_number === nextIncomplete)?.title ?? 'Workflow complete';
      setSystemNotice(
        complete
          ? 'Workflow complete. Generate a report or start the next workflow.'
          : `Step complete. Next step: ${nextStepTitle}.`
      );
      return {
        ...prev,
        completed_steps: completed,
        current_step: nextIncomplete,
        status: complete ? 'complete' : 'active'
      };
    });
  }

  function overrideCompleteStep() {
    completeStep();
    setSystemNotice('Step marked complete with override (proof missing).');
  }

  function focusProofTab() {
    setMobileTab('proof');
    setSystemNotice('Add proof upload or a note, then complete the step.');
  }

  function onAIUpdate(response: Partial<AIResponse> | null | undefined) {
    if (!response?.workflow_state) {
      console.warn('AI response missing workflow_state:', response);
      return;
    }
    const workflowState = response.workflow_state;
    setLatestAIResponse(response);

    setSession((prev) => ({
      ...prev,
      goal: workflowState.goal ?? prev.goal,
      mode: (workflowState.mode as WorkflowMode) ?? prev.mode,
      current_step: workflowState.current_step ?? prev.current_step,
      completed_steps:
        workflowState.completed_steps?.length
          ? workflowState.completed_steps
          : prev.completed_steps,
      confidence: workflowState.confidence ?? prev.confidence,
      detected_issues: response.detected_issues ?? prev.detected_issues,
      status:
        workflowState.is_complete || response.completion?.workflow_complete
          ? 'complete'
          : prev.status === 'blocked' && response.intent !== 'debug'
            ? 'active'
            : prev.status
    }));
  }

  function addUpload(upload: SessionUpload) {
    setUploads((prev) => clampUploads([upload, ...prev]));
    setSystemNotice(`Proof uploaded: ${upload.name}`);
    void saveUpload(session.id, upload);
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((upload) => upload.id !== id));
  }

  function addNote(content: string) {
    const note: SessionNote = { id: crypto.randomUUID(), content, created_at: new Date().toISOString() };
    setNotes((prev) => clampNotes([note, ...prev]));
    void saveNote(session.id, note);
  }

  function clearContext() {
    setUploads([]);
    setNotes([]);
  }

  function checkLatestProof() {
    if (uploads.length === 0 && notes.length === 0) {
      setSystemNotice('I need proof to check. Upload a screenshot/photo or add notes first.');
      return;
    }
    setQueuedPrompt('check my work');
  }

  function generateReport() {
    const nextRecommendations =
      workflow.id.includes('taskpilot-mvp-build') || session.goal.toLowerCase().includes('taskpilot')
        ? [
            'Connect Supabase persistence',
            'Add file/image upload',
            'Save sessions permanently',
            'Add robot API routes',
            'Deploy to Vercel'
          ]
        : ['Save this workflow as reusable template', 'Run another iteration', 'Share report with your team'];
    const reportObj = {
      workflow_name: workflow.workflow_name,
      goal: session.goal,
      completed_steps: session.completed_steps,
      issues_found: session.detected_issues,
      session_notes: notes.map((note) => note.content),
      summary:
        latestAIResponse?.completion?.completion_summary ||
        `Completed ${session.completed_steps.length} of ${workflow.steps.length} steps for ${workflow.workflow_name}.`,
      what_changed: [
        `Current step set to ${session.current_step}`,
        `${session.completed_steps.length} steps marked complete`,
        `${notes.length} notes and ${uploads.length} uploads captured`
      ],
      remaining_blockers: session.detected_issues.length ? session.detected_issues : ['No blockers detected'],
      next_five_actions: [
        'Finish Supabase persistence',
        'Add real image storage',
        'Add robot API routes',
        'Deploy to Vercel',
        'Record demo'
      ],
      robot_readiness_score:
        (envStatus?.hasOpenAIKey ? 15 : 0) +
        (envStatus?.supabaseEnabled ? 15 : 0) +
        15 + 10 + (workflow.id === 'taskpilot-mvp-build' ? 15 : 0),
      next_recommendations: nextRecommendations,
      created_at: new Date().toISOString()
    };
    setReport(reportObj);
    void saveReport(session.id, {
      workflow_name: workflow.workflow_name,
      goal: session.goal,
      summary: reportObj.summary,
      completed_steps: session.completed_steps,
      issues_found: session.detected_issues,
      next_recommendations: nextRecommendations,
      report: reportObj
    });
  }

  function markBlocked() {
    setSession((prev) => ({ ...prev, status: 'blocked' }));
    setSystemNotice('Session marked blocked. Paste the blocker/error/context so TaskPilot can debug.');
  }

  function resolveBlocked() {
    setSession((prev) => ({ ...prev, status: 'active' }));
    setSystemNotice('Blocker resolved. Continue with the current step or ask what next.');
  }

  function completeWorkflow() {
    setSession((prev) => ({
      ...prev,
      status: 'complete',
      completed_steps: workflow.steps.map((step) => step.step_number),
      current_step: workflow.steps.length
    }));
    setSystemNotice('Workflow complete. Generate a report or start the next workflow.');
  }

  function saveWorkflow() {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 1800);
    if (envStatus?.supabaseEnabled) {
      setSyncState('syncing');
      void syncSessionToSupabase(session.id, {
        workflow_slug: canonicalState.workflow_slug,
        goal: canonicalState.goal,
        mode: canonicalState.mode,
        status: canonicalState.status,
        current_step: canonicalState.current_step,
        completed_steps: canonicalState.completed_steps,
        detected_issues: canonicalState.detected_issues,
        ai_next_action: canonicalState.ai_next_action,
        ai_source: canonicalState.ai_source,
        confidence: canonicalState.confidence,
        started_at: canonicalState.created_at,
        completed_at: canonicalState.completed_at,
        updated_at: canonicalState.updated_at
      })
        .then((res) => {
          if (res.ok) {
            setSyncState('synced');
            setSyncErrorDetail('');
            return;
          }
          setSyncState('error');
          setSystemNotice('Saved locally. Supabase sync failed.');
          setSyncErrorDetail('API route /api/db/session failed. Check SUPABASE_DB_ENABLED and table schema.');
        })
        .catch((error) => {
          setSyncState('error');
          setSystemNotice('Saved locally. Supabase sync failed.');
          setSyncErrorDetail(error instanceof Error ? error.message : 'Supabase sync error');
        });
    }
  }

  function retrySync() {
    saveWorkflow();
  }

  useEffect(() => {
    function onMarkComplete() {
      completeStep();
    }
    function onAskWhatNext() {
      setQueuedPrompt('Based on current step and context, what is the best next move right now?');
    }
    function onGenerateSessionReport() {
      generateReport();
    }
    window.addEventListener('session-mark-complete', onMarkComplete as EventListener);
    window.addEventListener('session-ask-what-next', onAskWhatNext as EventListener);
    window.addEventListener('session-generate-report', onGenerateSessionReport as EventListener);
    return () => {
      window.removeEventListener('session-mark-complete', onMarkComplete as EventListener);
      window.removeEventListener('session-ask-what-next', onAskWhatNext as EventListener);
      window.removeEventListener('session-generate-report', onGenerateSessionReport as EventListener);
    };
  }, [session.current_step, session.completed_steps.length, workflow.steps.length]);

  const canonicalState: TaskPilotSessionState = toCanonicalSessionState({
    session_id: session.id,
    workflow_slug: workflow.id,
    workflow_name: workflow.workflow_name,
    goal: session.goal,
    mode: session.mode,
    status: session.status,
    current_step: session.current_step,
    completed_steps: session.completed_steps,
    ai_next_action: latestAIResponse?.next_action ?? '',
    detected_issues: session.detected_issues,
    confidence: session.confidence,
    notes,
    uploads,
    messages: chatMessages,
    report,
    ai_source: latestAIResponse?.ai_source ?? 'mock',
    sync_status: syncState,
    created_at: session.started_at,
    updated_at: new Date().toISOString(),
    completed_at: session.status === 'complete' ? new Date().toISOString() : null
  });

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="badge mb-2">{workflow.category} · {workflow.difficulty}</p>
            <h1 className="text-3xl font-black">{workflow.workflow_name}</h1>
            <p className={`mt-1 text-slate-400 ${showFullGoal ? '' : 'line-clamp-2'}`}>Goal: {session.goal}</p>
            {session.goal.length > 120 && (
              <button className="btn-ghost btn-sm mt-1" onClick={() => setShowFullGoal((prev) => !prev)}>{showFullGoal ? 'Hide full brief' : 'Show full brief'}</button>
            )}
            <p className="mt-1 text-sm text-slate-400">{session.completed_steps.length} / {workflow.steps.length} steps complete</p>
            <div className="mt-2 h-2 w-72 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.round((session.completed_steps.length / Math.max(1, workflow.steps.length)) * 100)}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/daily" className="btn-ghost">Daily Mode</Link>
            <ModeSelector value={session.mode} onChange={(mode) => setSession((prev) => ({ ...prev, mode }))} />
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {envStatus?.supabaseEnabled ? 'Supabase Sync On' : 'Local Mode'}
          </p>
          <span className="badge" title={syncErrorDetail || undefined}>
            {syncState === 'local' ? 'Local only' : syncState === 'syncing' ? 'Syncing' : syncState === 'synced' ? 'Synced to Supabase' : 'Supabase error'}
          </span>
        </div>
        {syncState === 'error' && (
          <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-200">
            <p>Saved locally. Supabase sync failed.</p>
            <p className="mt-1">{syncErrorDetail || 'Unknown sync error.'}</p>
            <button className="btn-secondary mt-2 text-xs" onClick={retrySync}>Retry Sync</button>
          </div>
        )}
        {session.status === 'blocked' && (
          <div className="card mb-5 border-amber-400/50 p-4">
            <p className="text-sm text-amber-200">This session is currently blocked. Add blocker context in chat or notes, then resolve blocker.</p>
          </div>
        )}
        {savedBanner && <div className="mb-5 rounded-xl border border-emerald-400/50 bg-emerald-400/10 p-3 text-sm text-emerald-200">Workflow snapshot saved locally.</div>}
        <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
          <button className={`btn-secondary btn-sm ${mobileTab === 'step' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab('step')}>Step</button>
          <button className={`btn-secondary btn-sm ${mobileTab === 'ai' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab('ai')}>AI</button>
          <button className={`btn-secondary btn-sm ${mobileTab === 'proof' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab('proof')}>Proof</button>
          <button className={`btn-secondary btn-sm ${mobileTab === 'tracker' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab('tracker')}>Tracker</button>
        </div>
        <div className="mb-4 card p-4 lg:hidden">
          <p className="text-sm text-slate-400">Progress</p>
          <p className="text-lg font-bold">Step {session.current_step} of {workflow.steps.length}</p>
          <p className="text-sm text-slate-300">Current: {currentStep?.title}</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[300px_1fr_420px]">
          <div className={`${mobileTab === 'tracker' ? 'block' : 'hidden'} overflow-y-auto lg:block`}>
            <StepTracker steps={workflow.steps} currentStep={session.current_step} completedSteps={session.completed_steps} proofStatusByStep={proofStatusByStep} />
          </div>
          <div className={`space-y-5 ${mobileTab === 'step' || mobileTab === 'proof' ? 'block' : 'hidden'} lg:block`}>
            {isWorkflowComplete ? (
              <div className="card p-6">
                <p className="badge mb-3">Workflow Complete</p>
                <h2 className="mb-2 text-3xl font-black text-white">{workflow.workflow_name}</h2>
                <p className="mb-4 text-slate-300">
                  Workflow complete. You finished {workflow.workflow_name}. TaskPilot captured your completed steps and can now generate a report or turn this into a reusable workflow.
                </p>
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <p className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">Percent complete: {Math.round((session.completed_steps.length / Math.max(1, workflow.steps.length)) * 100)}%</p>
                  <p className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">Completed steps: {session.completed_steps.length}/{workflow.steps.length}</p>
                  <p className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">Issues detected: {session.detected_issues.length || 0}</p>
                  <p className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">Total messages: {messageCount}</p>
                  <p className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">Proof context: {uploads.length} uploads · {notes.length} notes</p>
                </div>
                <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                  <p className="mb-2 text-sm font-semibold text-white">Completed steps list</p>
                  <p className="text-sm text-slate-300">
                    {workflow.steps.filter((step) => session.completed_steps.includes(step.step_number)).map((step) => `${step.step_number}. ${step.title}`).join(' | ') || 'No completed steps yet.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={generateReport} className="btn-primary">Generate Report</button>
                  <button onClick={saveWorkflow} className="btn-secondary">Save Workflow</button>
                  <Link href="/session/taskpilot-mvp-build" className="btn-secondary">Start Next Build Task</Link>
                  <Link href="/dashboard" className="btn-secondary">Return to Dashboard</Link>
                </div>
              </div>
            ) : (
              <CurrentStepCard
                step={currentStep}
                onComplete={completeStep}
                onOverrideComplete={overrideCompleteStep}
                onAddProof={focusProofTab}
                mode={session.mode}
                hasProof={hasCurrentProof}
                nextAction={latestAIResponse?.next_action}
                status={session.status}
                syncStatus={syncState}
                lastSavedAt={lastSavedAt}
                onBlocked={markBlocked}
                onAskExplain={() => setQueuedPrompt('Explain this step in plain language and tell me why it matters.')}
                onAskDebug={() => setQueuedPrompt('Debug this step. Ask me for exact logs if missing and give the first fix to try.')}
              />
            )}
            <div className="card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Workflow controls</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={markBlocked} className="btn-secondary btn-sm">Mark Blocked</button>
                <button onClick={resolveBlocked} className="btn-ghost btn-sm">Resolve Blocker</button>
                <button onClick={completeWorkflow} className="btn-ghost btn-sm">Complete Workflow</button>
                <button onClick={generateReport} className="btn-secondary btn-sm">Generate Report</button>
              </div>
              {systemNotice && <p className="mt-3 text-sm text-slate-300">{systemNotice}</p>}
            </div>
            <div className={`${mobileTab === 'proof' ? 'block' : 'hidden'} lg:block`}>
            <UploadPanel
              uploads={uploads}
              notes={notes}
              onAddUpload={addUpload}
              onRemoveUpload={removeUpload}
              onAddNote={addNote}
              onClearContext={clearContext}
              onCheckLatestProof={checkLatestProof}
            />
            </div>
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Session notes / uploads</h2>
              <p className="mb-3 text-xs text-slate-500">{uploads.length} uploads · {notes.length} note{notes.length === 1 ? '' : 's'}</p>
              {uploads.length === 0 && notes.length === 0 ? (
                <p className="text-sm text-slate-500">No context added yet. Upload proof to let TaskPilot check your work.</p>
              ) : (
                <div className="space-y-2">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="rounded-xl bg-slate-950/50 p-3 text-sm text-slate-300">
                      <p className="font-semibold">{upload.name}</p>
                      <p className="text-xs text-slate-500">{new Date(upload.created_at).toLocaleString()} · Use as proof</p>
                      <img src={upload.dataUrl} alt={upload.name} className="mt-2 h-20 rounded-md" />
                    </div>
                  ))}
                  {notes.map((note) => <p key={note.id} className="rounded-xl bg-slate-950/50 p-3 text-sm text-slate-300">{note.content}</p>)}
                </div>
              )}
            </div>
            <details className="card p-5">
              <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-slate-400">Current AI State (debug)</summary>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p><span className="text-slate-500">ai_source:</span> {latestAIResponse?.ai_source ?? 'unknown'}</p>
                <p><span className="text-slate-500">OpenAI key detected:</span> {envStatus?.hasOpenAIKey ? 'yes' : 'no'}</p>
                <p><span className="text-slate-500">OpenAI key masked:</span> {envStatus?.openAIKeyPrefix ?? 'n/a'}</p>
                <p><span className="text-slate-500">Supabase URL detected:</span> {envStatus?.hasSupabaseUrl ? 'yes' : 'no'}</p>
                <p><span className="text-slate-500">Supabase anon key detected:</span> {envStatus?.hasSupabaseAnonKey ? 'yes' : 'no'}</p>
                <p><span className="text-slate-500">Supabase service role detected:</span> {envStatus?.hasSupabaseServiceRole ? 'yes' : 'no'}</p>
                <p><span className="text-slate-500">Supabase DB enabled:</span> {envStatus?.supabaseEnabled ? 'yes' : 'no'}</p>
                <p><span className="text-slate-500">intent:</span> {latestAIResponse?.intent ?? 'general'}</p>
                <p><span className="text-slate-500">mode:</span> {session.mode}</p>
                <p><span className="text-slate-500">uploads count:</span> {uploads.length}</p>
                <p><span className="text-slate-500">notes count:</span> {notes.length}</p>
                <p><span className="text-slate-500">latest upload:</span> {uploads[0]?.name ?? 'none'}</p>
                <p><span className="text-slate-500">latest note:</span> {notes[0]?.content?.slice(0, 60) ?? 'none'}</p>
                <p><span className="text-slate-500">current_step:</span> {session.current_step}</p>
                <p><span className="text-slate-500">completed_steps:</span> {session.completed_steps.join(', ') || 'none'}</p>
                <p><span className="text-slate-500">session.status:</span> {session.status}</p>
                <p><span className="text-slate-500">is_complete:</span> {String(isWorkflowComplete)}</p>
                <p><span className="text-slate-500">confidence:</span> {session.confidence}</p>
                <p><span className="text-slate-500">detected_issues:</span> {session.detected_issues.join(', ') || 'none'}</p>
                <p><span className="text-slate-500">last saved:</span> {new Date(lastSavedAt).toLocaleTimeString()}</p>
              </div>
            </details>
            {report && (
              <div className="card p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Workflow Report</h2>
                <p className="mb-2 text-sm text-slate-300"><span className="text-slate-500">Summary:</span> {report.summary}</p>
                <p className="mb-2 text-sm text-slate-300"><span className="text-slate-500">What changed:</span> {report.what_changed?.join(' | ') || 'n/a'}</p>
                <p className="mb-2 text-sm text-slate-300"><span className="text-slate-500">Completed steps:</span> {report.completed_steps.join(', ') || 'none'}</p>
                <p className="mb-2 text-sm text-slate-300"><span className="text-slate-500">Remaining blockers:</span> {report.remaining_blockers?.join(', ') || report.issues_found.join(', ') || 'none'}</p>
                <p className="mb-2 text-sm text-slate-300"><span className="text-slate-500">Session notes:</span> {report.session_notes.join(' | ') || 'none'}</p>
                <p className="mb-2 text-sm text-slate-300"><span className="text-slate-500">Next 5 actions:</span> {report.next_five_actions?.join(' -> ') || report.next_recommendations.join(' -> ')}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Robot readiness score:</span> {report.robot_readiness_score ?? 0}/100</p>
                <Link href="/session/taskpilot-mvp-build" className="btn-secondary mt-3 inline-flex">Start Next Build Task</Link>
              </div>
            )}
          </div>
          <div className={`order-2 ${mobileTab === 'ai' ? 'block' : 'hidden'} lg:order-none lg:block`}>
            <AIChatPanel
              workflow={workflow}
              session={session}
              uploads={uploads}
              notes={notes}
              latestAIResponse={latestAIResponse}
              systemNotice={systemNotice}
              queuedPrompt={queuedPrompt}
              onQueuedPromptHandled={() => setQueuedPrompt(null)}
              onMarkStepCompleteFromAI={completeStep}
              onMessageCountChange={setMessageCount}
              onMessagesChange={setChatMessages}
              onAIUpdate={onAIUpdate}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
