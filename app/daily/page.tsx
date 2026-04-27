'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DailyLoopProgress } from '@/components/DailyLoopProgress';
import { DailyScorecard } from '@/components/DailyScorecard';
import { LearningCard } from '@/components/LearningCard';
import { Nav } from '@/components/Nav';
import { useToast } from '@/components/ToastProvider';
import { addRecentActivity } from '@/lib/activity';
import { trackProductEvent } from '@/lib/productEvents';
import { getDailyStorageKey, getReportsStorageKey } from '@/lib/storage';
import { saveGeneratedWorkflow } from '@/lib/workflowPersistence';
import type { DailyAIResponse, DailyCommandState, DailyCoachMessage, DailyEvent, DailyOutcome, DailyReport, FocusBlock, LearningCard as LearningCardType, Workflow } from '@/types/workflow';

type DayType = NonNullable<DailyCommandState['selected_day_type']>;
type DailyTab = 'outcomes' | 'focus' | 'coach' | 'timeline' | 'report';

type OutcomeQuality = {
  clarity: number;
  realism: number;
  proofability: number;
  daily_scope: number;
  value: number;
  issues: string[];
  rewrite_suggestion: string;
};

const BASE_OUTCOME_LIBRARY: Record<DayType, string[]> = {
  build: ['Ship one scoped product improvement', 'Fix one visible bug', 'Record a progress demo'],
  money: ['Send 10 targeted outreach messages', 'Create one conversion asset', 'Follow up with 3 warm leads'],
  admin: ['Clear the highest-risk overdue task', 'Document one recurring SOP', 'Organize one repeated system'],
  learning: ['Learn one concept and produce proof notes', 'Apply one concept in a tiny artifact', 'Summarize key takeaways'],
  personal: ['Complete one meaningful personal task', 'Run one deep focus block', 'Close one open loop'],
  custom: ['Define one concrete one-day outcome', 'Set first action and proof requirement', 'Complete one focus block']
};

function evaluateOutcomeQuality(title: string, proofRequired: string): OutcomeQuality {
  const lower = title.toLowerCase();
  const issues: string[] = [];
  if (title.length < 18) issues.push('Too short/vague');
  if (/improve productivity|work on project|research more|finalize mvp|develop core modules/i.test(lower)) issues.push('Too broad');
  if (/antigravity|teleport|time travel|infinite energy/i.test(lower)) issues.push('Unrealistic claim');
  if (!proofRequired.trim()) issues.push('Missing proof definition');
  const clarity = Math.max(0, 10 - (issues.includes('Too short/vague') ? 4 : 0) - (issues.includes('Too broad') ? 3 : 0));
  const realism = issues.includes('Unrealistic claim') ? 2 : 9;
  const proofability = proofRequired.trim() ? 8 : 3;
  const daily_scope = issues.includes('Too broad') ? 4 : 8;
  const value = /money|client|sales|ship|fix|deploy/i.test(lower) ? 8 : 6;
  return {
    clarity,
    realism,
    proofability,
    daily_scope,
    value,
    issues,
    rewrite_suggestion: issues.length ? 'Rewrite into one-day scoped output with visible proof and first action.' : ''
  };
}

function qualityLabel(score: number) {
  if (score >= 8) return 'Strong';
  if (score >= 6) return 'Needs clarity';
  if (score >= 4) return 'Too broad';
  return 'Not proofable';
}

function nowIso() {
  return new Date().toISOString();
}

function buildInitialState(date: string): DailyCommandState {
  return {
    date,
    status: 'planning',
    selected_day_type: null,
    custom_context: '',
    outcomes: [],
    active_outcome_id: null,
    active_focus_block: null,
    events: [],
    coach_messages: [],
    report: null,
    total_xp: 0,
    xp_today: 0,
    level: 1,
    streak: 0,
    best_streak: 0,
    proof_count_today: 0,
    lessons: [],
    last_saved_at: nowIso()
  };
}

export default function DailyPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const storageKey = getDailyStorageKey(today);

  const [state, setState] = useState<DailyCommandState>(buildInitialState(today));
  const [mobileTab, setMobileTab] = useState<DailyTab>('outcomes');
  const [input, setInput] = useState('');
  const [aiMode, setAiMode] = useState<'openai' | 'mock'>('mock');
  const [syncLabel, setSyncLabel] = useState('Local');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPlanReview, setShowPlanReview] = useState(false);
  const [proposedOutcomes, setProposedOutcomes] = useState<DailyOutcome[]>([]);
  const [customDirection, setCustomDirection] = useState('');
  const [dayType, setDayType] = useState<DayType>('personal');
  const [selectedDayType, setSelectedDayType] = useState<DayType | null>(null);
  const [planWarning, setPlanWarning] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [showReplacePrompt, setShowReplacePrompt] = useState(false);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<DailyOutcome>>({});
  const [blockerModalOutcomeId, setBlockerModalOutcomeId] = useState<string | null>(null);
  const [blockerNote, setBlockerNote] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lessonSourceId, setLessonSourceId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LearningCardType>({
    id: '',
    lesson_title: '',
    summary: '',
    mistake_or_blocker: '',
    principle: '',
    next_time_action: '',
    source_type: 'daily_outcome',
    source_id: '',
    created_at: ''
  });
  const [reflectionDraft, setReflectionDraft] = useState({
    moved_forward: '',
    proof_created: '',
    time_leak: '',
    repeat: '',
    avoid: '',
    tomorrow_first_move: ''
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          ...buildInitialState(today),
          ...parsed,
          total_xp: parsed?.total_xp ?? 0,
          xp_today: parsed?.xp_today ?? 0,
          level: parsed?.level ?? 1,
          streak: parsed?.streak ?? 0,
          best_streak: parsed?.best_streak ?? 0,
          proof_count_today: parsed?.proof_count_today ?? 0,
          lessons: Array.isArray(parsed?.lessons) ? parsed.lessons : []
        });
        if (parsed?.selected_day_type) {
          setDayType(parsed.selected_day_type);
          setSelectedDayType(parsed.selected_day_type);
        }
        if (parsed?.custom_context) setCustomDirection(parsed.custom_context);
      }
    } catch {
      setState(buildInitialState(today));
    }
    void fetch('/api/health').then((res) => res.json()).then((health) => {
      setAiMode(health?.env?.hasOpenAIKey ? 'openai' : 'mock');
      setSyncLabel(health?.env?.supabaseEnabled ? 'Synced' : 'Local');
    }).catch(() => null);
  }, [storageKey, today]);

  function openPlanModal() {
    setSelectedDayType(null);
    setPlanWarning('');
    setProposedOutcomes([]);
    setShowPlanReview(false);
    setShowPlanModal(true);
  }

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ ...state, last_saved_at: nowIso() }));
  }, [storageKey, state]);

  useEffect(() => {
    if (!state.active_focus_block || state.active_focus_block.status !== 'active') return;
    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev.active_focus_block || prev.active_focus_block.status !== 'active') return prev;
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(prev.active_focus_block.started_at).getTime()) / 60000));
        return {
          ...prev,
          active_focus_block: {
            ...prev.active_focus_block,
            actual_minutes: elapsed,
            last_progress_at: nowIso()
          }
        };
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [state.active_focus_block?.id, state.active_focus_block?.status]);

  useEffect(() => {
    function onAddOutcome() {
      addOutcome();
    }
    function onPlanToday() {
      openPlanModal();
    }
    function onStartFocus() {
      pickBestOutcome();
    }
    function onGenerateReport() {
      generateReport();
    }
    function onLogProof() {
      if (state.active_outcome_id) logProof(state.active_outcome_id, 'Quick proof from command palette.');
      else pushToast('No active outcome for proof.');
    }
    function onSaveLesson() {
      if (state.active_outcome_id) openLessonModal(state.active_outcome_id);
      else pushToast('Complete an outcome first to save a lesson.');
    }
    function onImprovePage() {
      addOutcome('Improve Daily Command Center UX');
      updateState((prev) => ({
        ...prev,
        outcomes: prev.outcomes.map((o) => o.title === 'Improve Daily Command Center UX'
          ? {
              ...o,
              first_action: 'Identify one confusing interaction on this page.',
              proof_required: 'Before/after screenshot or deployed commit.',
              estimated_minutes: 60,
              category: 'build',
              value_score: 8,
              leverage_score: 9
            }
          : o)
      }));
    }
    window.addEventListener('daily-add-outcome', onAddOutcome as EventListener);
    window.addEventListener('daily-plan-today', onPlanToday as EventListener);
    window.addEventListener('daily-start-focus', onStartFocus as EventListener);
    window.addEventListener('daily-log-proof', onLogProof as EventListener);
    window.addEventListener('daily-generate-report', onGenerateReport as EventListener);
    window.addEventListener('daily-save-lesson', onSaveLesson as EventListener);
    window.addEventListener('daily-improve-page', onImprovePage as EventListener);
    return () => {
      window.removeEventListener('daily-add-outcome', onAddOutcome as EventListener);
      window.removeEventListener('daily-plan-today', onPlanToday as EventListener);
      window.removeEventListener('daily-start-focus', onStartFocus as EventListener);
      window.removeEventListener('daily-log-proof', onLogProof as EventListener);
      window.removeEventListener('daily-generate-report', onGenerateReport as EventListener);
      window.removeEventListener('daily-save-lesson', onSaveLesson as EventListener);
      window.removeEventListener('daily-improve-page', onImprovePage as EventListener);
    };
  }, [state.outcomes.length, state.active_outcome_id]);

  function updateState(mutator: (prev: DailyCommandState) => DailyCommandState) {
    setState((prev) => ({ ...mutator(prev), last_saved_at: nowIso() }));
  }

  function logEvent(type: DailyEvent['type'], content: string) {
    updateState((prev) => ({ ...prev, events: [{ id: crypto.randomUUID(), type, content, created_at: nowIso() }, ...prev.events].slice(0, 200) }));
  }

  function awardXP(amount: number, reason: string) {
    updateState((prev) => {
      const total = (prev.total_xp || 0) + amount;
      const level = Math.floor(total / 100) + 1;
      return { ...prev, total_xp: total, xp_today: (prev.xp_today || 0) + amount, level };
    });
    pushToast(`+${amount} XP ${reason}`);
  }

  function makeOutcome(title: string, idx: number): DailyOutcome {
    const baseProof = 'One visible artifact proving progress';
    const q = evaluateOutcomeQuality(title, baseProof);
    const quality = Math.round((q.clarity + q.realism + q.proofability + q.daily_scope + q.value) / 5);
    const valueScore = q.value;
    const urgency: DailyOutcome['urgency'] = dayType === 'money' ? 'high' : 'medium';
    const effort: DailyOutcome['effort'] = dayType === 'admin' ? 'low' : dayType === 'build' ? 'high' : 'medium';
    const urgencyBonus = urgency === 'high' ? 2 : urgency === 'medium' ? 1 : 0;
    const effortPenalty = effort === 'high' ? 2 : effort === 'medium' ? 1 : 0;
    const leverage = Math.max(1, Math.min(10, Math.round((valueScore * 1.5) + urgencyBonus - effortPenalty)));
    return {
      id: crypto.randomUUID(),
      title,
      why_it_matters: 'Creates visible progress by end of day.',
      category: dayType === 'money' ? 'money' : dayType === 'admin' ? 'admin' : dayType === 'learning' ? 'learning' : 'build',
      priority: Math.min(3, idx + 1) as 1 | 2 | 3,
      status: 'planned',
      estimated_minutes: 60,
      actual_minutes: 0,
      proof_required: baseProof,
      proof_provided: '',
      first_action: 'Start a 5-minute first move.',
      value_score: valueScore,
      quality_score: quality,
      leverage_score: leverage,
      money_potential: dayType === 'money' ? 'high' : dayType === 'build' ? 'medium' : 'low',
      urgency,
      effort,
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: null
    };
  }

  function addOutcome(title?: string) {
    const seed = title || `Outcome ${state.outcomes.length + 1}`;
    const outcome = makeOutcome(seed, state.outcomes.length);
    updateState((prev) => ({ ...prev, outcomes: [...prev.outcomes, outcome].slice(0, 3) }));
    logEvent('created_outcome', `Outcome created: ${seed}`);
    addRecentActivity({ type: 'daily_outcome_created', title: seed, route: '/daily' });
    void trackProductEvent('daily_plan_created', '/daily', { title: seed, dayType });
    awardXP(10, 'Plan created');
    pushToast('Outcome added.');
  }

  async function proposePlan() {
    const chosenDayType = selectedDayType;
    if (!chosenDayType) {
      setPlanWarning('Choose the kind of day first.');
      return;
    }
    if (chosenDayType === 'custom' && !customDirection.trim()) {
      setPlanWarning('Add context for your custom day.');
      return;
    }
    setPlanWarning('');
    setIsGeneratingPlan(true);
    setGenerationStage('Scoping outcomes');
    const userPrefs = (() => {
      try { return JSON.parse(localStorage.getItem('taskpilot-user-preferences') || '{}'); } catch { return {}; }
    })();
    const prompt = `Plan top 3 outcomes for a ${chosenDayType} day. Context: ${customDirection || 'none'}.`;
    setGenerationStage('Adding proof requirements');
    try {
      const res = await fetch('/api/daily/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          generateTop3: true,
          selected_day_type: chosenDayType,
          custom_context: customDirection,
          existing_outcomes: state.outcomes,
          active_focus_block: state.active_focus_block,
          user_preferences: userPrefs,
          recent_daily_events: state.events.slice(0, 12),
          dayType: chosenDayType,
          customDirection,
          outcomes: state.outcomes,
          activeFocus: state.active_focus_block,
          fullState: state
        })
      });
      const payload = await res.json();
      setGenerationStage('Ranking leverage');
      const generated = Array.isArray(payload?.data?.generated_outcomes) ? payload.data.generated_outcomes : BASE_OUTCOME_LIBRARY[chosenDayType];
      setProposedOutcomes(generated.slice(0, 3).map((title: string, idx: number) => makeOutcome(title, idx)));
      setShowPlanReview(true);
    } finally {
      setIsGeneratingPlan(false);
      setGenerationStage('');
    }
  }

  function acceptProposedOutcomes(selectedIds?: string[]) {
    if (state.outcomes.length) {
      setShowReplacePrompt(true);
      return;
    }
    acceptProposedOutcomesWithMode('replace', selectedIds);
  }

  function acceptProposedOutcomesWithMode(mode: 'replace' | 'append', selectedIds?: string[]) {
    const chosen = selectedIds?.length ? proposedOutcomes.filter((item) => selectedIds.includes(item.id)) : proposedOutcomes;
    updateState((prev) => ({
      ...prev,
      selected_day_type: selectedDayType || dayType,
      custom_context: customDirection,
      outcomes: (mode === 'append'
        ? [...prev.outcomes, ...chosen]
        : [...prev.outcomes.filter((o) => o.status === 'done'), ...chosen]
      ).slice(0, 6).map((item, idx) => ({ ...item, priority: Math.min(3, idx + 1) as 1 | 2 | 3 }))
    }));
    logEvent('generated_top3', `Created 3-outcome ${selectedDayType || dayType} day plan.`);
    void trackProductEvent('daily_plan_created', '/daily', { dayType, count: chosen.length });
    awardXP(10, 'Plan created');
    pushToast('Daily plan accepted.');
    setShowPlanReview(false);
    setShowPlanModal(false);
    setShowReplacePrompt(false);
  }

  function pickBestOutcome() {
    const candidate = [...state.outcomes]
      .filter((o) => o.status !== 'done')
      .sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))[0];
    if (!candidate) return pushToast('No outcomes available yet.');
    startFocus(candidate.id);
  }

  function startFocus(outcomeId: string) {
    const outcome = state.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) return;
    const block: FocusBlock = {
      id: crypto.randomUUID(),
      outcome_id: outcome.id,
      title: outcome.title,
      status: 'active',
      started_at: nowIso(),
      ended_at: null,
      planned_minutes: 25,
      actual_minutes: 0,
      current_action: outcome.first_action || `Start: ${outcome.title}`,
      blocker: '',
      drift_score: 0,
      last_progress_at: nowIso()
    };
    updateState((prev) => ({
      ...prev,
      status: 'focus',
      active_outcome_id: outcome.id,
      active_focus_block: block,
      outcomes: prev.outcomes.map((o) => ({ ...o, status: o.id === outcome.id ? 'active' : o.status === 'active' ? 'selected' : o.status }))
    }));
    logEvent('started_focus', `Focus started: ${outcome.title}`);
    addRecentActivity({ type: 'focus_started', title: `Focus started for ${outcome.title}`, route: '/daily' });
    void trackProductEvent('focus_started', '/daily', { outcome_id: outcome.id, title: outcome.title });
    awardXP(15, 'Focus started');
    pushToast('Focus block started.');
  }

  function openEditOutcome(id: string) {
    const outcome = state.outcomes.find((o) => o.id === id);
    if (!outcome) return;
    setEditingOutcomeId(id);
    setEditingDraft(outcome);
  }

  function saveOutcomeEdit() {
    if (!editingOutcomeId) return;
    const quality = evaluateOutcomeQuality(String(editingDraft.title || ''), String(editingDraft.proof_required || ''));
    const qualityScore = Math.round((quality.clarity + quality.realism + quality.proofability + quality.daily_scope + quality.value) / 5);
    updateState((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((o) => o.id === editingOutcomeId ? { ...o, ...editingDraft, quality_score: qualityScore, updated_at: nowIso() } as DailyOutcome : o)
    }));
    setEditingOutcomeId(null);
    setEditingDraft({});
    logEvent('created_outcome', 'Outcome edited.');
    pushToast('Outcome updated.');
  }

  function completeOutcome(id: string) {
    const target = state.outcomes.find((o) => o.id === id);
    if (!target) return;
    if (!target.proof_provided.trim()) {
      pushToast('Log proof before marking done.');
      return;
    }
    updateState((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((o) => o.id === id ? { ...o, status: 'done', completed_at: nowIso(), updated_at: nowIso() } : o),
      active_focus_block: prev.active_focus_block?.outcome_id === id ? { ...prev.active_focus_block, status: 'complete', ended_at: nowIso() } : prev.active_focus_block,
      active_outcome_id: prev.active_outcome_id === id ? null : prev.active_outcome_id
    }));
    logEvent('completed_outcome', `Outcome completed: ${target.title}`);
    addRecentActivity({ type: 'daily_outcome_completed', title: target.title, route: '/daily' });
    awardXP(20, 'Outcome complete');
    pushToast('Outcome marked done.');
  }

  function openBlockedModal(id: string) {
    setBlockerModalOutcomeId(id);
    setBlockerNote('');
  }

  function saveBlockedOutcome() {
    if (!blockerModalOutcomeId) return;
    updateState((prev) => ({
      ...prev,
      status: 'blocked',
      outcomes: prev.outcomes.map((o) => o.id === blockerModalOutcomeId ? { ...o, status: 'blocked', blocker_note: blockerNote, updated_at: nowIso() } : o),
      active_focus_block: prev.active_focus_block?.outcome_id === blockerModalOutcomeId ? { ...prev.active_focus_block, status: 'blocked', blocker: blockerNote } : prev.active_focus_block
    }));
    logEvent('blocked', `Blocked: ${blockerNote || 'Outcome blocked.'}`);
    setBlockerModalOutcomeId(null);
    pushToast('Outcome blocked.');
  }

  function logProof(id: string, proof: string) {
    updateState((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((o) => o.id === id ? { ...o, proof_provided: proof, updated_at: nowIso() } : o)
    }));
    logEvent('proof_added', 'Proof logged.');
    void trackProductEvent('proof_logged', '/daily', { outcome_id: id });
    updateState((prev) => ({ ...prev, proof_count_today: (prev.proof_count_today || 0) + 1 }));
    awardXP(15, 'Evidence logged');
    pushToast('Proof logged.');
  }

  function refineOutcome(id: string) {
    updateState((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((o) => {
        if (o.id !== id) return o;
        const refinedTitle = /research|prototype|antigravity|improve/i.test(o.title)
          ? `Create a one-day feasibility brief for "${o.title}" with 3 sources, 3 constraints, and 3 open questions`
          : `${o.title} (one-day scoped with visible proof)`;
        const quality = evaluateOutcomeQuality(refinedTitle, o.proof_required || 'Visible artifact');
        const score = Math.round((quality.clarity + quality.realism + quality.proofability + quality.daily_scope + quality.value) / 5);
        return { ...o, title: refinedTitle, quality_score: score, updated_at: nowIso() };
      })
    }));
    logEvent('created_outcome', 'Outcome refined for clarity and proofability.');
    pushToast('Outcome refined.');
  }

  async function convertOutcomeToWorkflow(id: string) {
    const outcome = state.outcomes.find((o) => o.id === id);
    if (!outcome) return;
    const res = await fetch('/api/workflows/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: outcome.title,
        category: outcome.category === 'money' ? 'business_sop' : outcome.category === 'build' ? 'coding' : 'productivity',
        desired_outcome: outcome.why_it_matters,
        steps_count: 7,
        output_style: 'practical checklist'
      })
    });
    const payload = await res.json();
    const raw = payload?.workflow;
    if (!raw) return pushToast('Could not convert outcome right now.');
    const wf: Workflow = {
      id: raw.id || raw.slug || outcome.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      workflow_name: raw.workflow_name || `${outcome.title} Workflow`,
      category: raw.category || 'productivity',
      difficulty: raw.difficulty || 'beginner',
      estimated_time: raw.estimated_time || '60 minutes',
      required_tools: raw.required_tools || [],
      required_materials: raw.required_materials || [],
      prerequisites: raw.prerequisites || [],
      steps: raw.steps || [],
      completion_criteria: raw.completion_criteria || outcome.title,
      report_template: raw.report_template || { summary: 'Generated from daily outcome.', issues_found: [], fixes_made: [], recommendations: [] }
    };
    saveGeneratedWorkflow(wf);
    addRecentActivity({ type: 'workflow_generated', title: `Converted outcome to workflow: ${wf.workflow_name}`, route: `/session/${wf.id}` });
    logEvent('completed_action', 'Converted active outcome to workflow.');
    awardXP(15, 'Workflow created');
    pushToast('Workflow created from outcome.');
    router.push(`/session/${wf.id}`);
  }

  function openLessonModal(sourceId: string) {
    const source = state.outcomes.find((o) => o.id === sourceId);
    setLessonSourceId(sourceId);
    setLessonDraft({
      id: crypto.randomUUID(),
      lesson_title: source ? `Lesson: ${source.title}` : 'New lesson',
      summary: source?.why_it_matters || '',
      mistake_or_blocker: '',
      principle: '',
      next_time_action: '',
      source_type: 'daily_outcome',
      source_id: sourceId,
      created_at: nowIso()
    });
  }

  function saveLesson() {
    if (!lessonSourceId) return;
    updateState((prev) => ({ ...prev, lessons: [lessonDraft, ...(prev.lessons || [])].slice(0, 50) }));
    setLessonSourceId(null);
    awardXP(10, 'Lesson captured');
    pushToast('Lesson saved.');
  }

  async function sendCoachMessage(promptOverride?: string) {
    const content = (promptOverride ?? input).trim();
    if (!content) return;
    setInput('');
    const userMsg: DailyCoachMessage = { id: crypto.randomUUID(), role: 'user', content, created_at: nowIso() };
    updateState((prev) => ({ ...prev, coach_messages: [...prev.coach_messages, userMsg].slice(-80) }));
    logEvent('coach_message_sent', `Coach: ${content.slice(0, 60)}`);
    const res = await fetch('/api/daily/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        selected_day_type: selectedDayType || dayType,
        custom_context: customDirection,
        dayType,
        customDirection,
        outcomes: state.outcomes,
        focus: state.active_focus_block,
        events: state.events,
        report: state.report,
        xp_state: { total_xp: state.total_xp || 0, xp_today: state.xp_today || 0, streak: state.streak || 0, level: state.level || 1 },
        fullState: state
      })
    });
    const payload = await res.json();
    const ai: DailyAIResponse = payload?.data;
    const assistant: DailyCoachMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: ai?.direct_answer || 'Pick one concrete next action and begin now.',
      created_at: nowIso(),
      ai
    };
    updateState((prev) => ({ ...prev, coach_messages: [...prev.coach_messages, assistant].slice(-80) }));
  }

  function generateReport() {
    const completed = state.outcomes.filter((o) => o.status === 'done');
    const blocked = state.outcomes.filter((o) => o.status === 'blocked');
    const skipped = state.outcomes.filter((o) => o.status === 'skipped');
    const unfinished = state.outcomes.filter((o) => o.status !== 'done');
    const totalFocusMinutes = state.active_focus_block?.actual_minutes || state.outcomes.reduce((sum, o) => sum + o.actual_minutes, 0);
    const report: DailyReport = {
      id: crypto.randomUUID(),
      date: state.date,
      completed_outcomes: completed,
      blocked_outcomes: blocked,
      skipped_outcomes: skipped,
      total_focus_minutes: totalFocusMinutes,
      summary: `Completed ${completed.length}/${state.outcomes.length} outcomes with ${totalFocusMinutes} focus minutes.`,
      wins: completed.map((o) => o.title),
      leaks: blocked.map((o) => o.blocker_note || o.title),
      tomorrow_first_action: unfinished[0] ? `Start with: ${unfinished[0].title}` : 'Start with highest-leverage new outcome.',
      money_score: Math.min(10, completed.filter((o) => o.category === 'money').length * 4 + 2),
      execution_score: Math.min(10, completed.length * 3 + (totalFocusMinutes >= 50 ? 2 : 0)),
      created_at: nowIso()
    };
    updateState((prev) => ({ ...prev, status: 'complete', report }));
    try {
      const raw = localStorage.getItem(getReportsStorageKey());
      const list = raw ? JSON.parse(raw) : [];
      localStorage.setItem(getReportsStorageKey(), JSON.stringify([{ id: report.id, type: 'daily', report, created_at: report.created_at }, ...(Array.isArray(list) ? list : [])].slice(0, 200)));
    } catch {
      // ignore local report indexing failure
    }
    logEvent('report_generated', 'Daily report generated.');
    void trackProductEvent('daily_report_generated', '/daily', { report_id: report.id, execution_score: report.execution_score });
    addRecentActivity({ type: 'daily_report_generated', title: 'Daily report generated', route: '/daily' });
    const completedCount = completed.length;
    if (completedCount > 0) {
      updateState((prev) => {
        const streak = (prev.streak || 0) + 1;
        return { ...prev, streak, best_streak: Math.max(prev.best_streak || 0, streak) };
      });
      pushToast('Streak protected');
    }
    awardXP(25, 'Daily debrief complete');
    pushToast('Day closed with report.');
  }

  function carryForward() {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextKey = getDailyStorageKey(nextDay.toISOString().slice(0, 10));
    const carry = state.outcomes.filter((o) => o.status !== 'done').map((o, idx) => ({
      ...o,
      id: crypto.randomUUID(),
      status: 'planned' as const,
      completed_at: null,
      priority: Math.min(3, idx + 1) as 1 | 2 | 3,
      updated_at: nowIso()
    }));
    const existingRaw = localStorage.getItem(nextKey);
    const existing = existingRaw ? JSON.parse(existingRaw) : buildInitialState(nextDay.toISOString().slice(0, 10));
    localStorage.setItem(nextKey, JSON.stringify({ ...existing, outcomes: carry }));
    logEvent('carry_over', `Carried ${carry.length} outcomes to tomorrow.`);
    awardXP(10, 'Carry forward');
    pushToast('Unfinished outcomes carried to tomorrow.');
  }

  const activeFocus = state.active_focus_block;
  const recommendedOutcome = [...state.outcomes]
    .filter((o) => o.status !== 'done')
    .sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))[0];
  const shownEvents = showAllEvents ? state.events : state.events.slice(0, 8);
  const completedToday = state.outcomes.filter((o) => o.status === 'done').length;
  const focusMinutesToday = state.active_focus_block?.actual_minutes || state.outcomes.reduce((sum, o) => sum + (o.actual_minutes || 0), 0);
  const dailyStreak = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    return Object.keys(localStorage).filter((key) => key.includes('taskpilot-daily-')).reduce((sum, key) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        return parsed?.report ? sum + 1 : sum;
      } catch {
        return sum;
      }
    }, 0);
  }, []);
  const loopStep: 'plan' | 'focus' | 'prove' | 'reflect' | 'level' =
    !state.outcomes.length ? 'plan'
      : state.active_focus_block?.status === 'active' ? 'focus'
        : (state.proof_count_today || 0) > 0 && !state.report ? 'prove'
          : state.report ? 'level'
            : 'reflect';
  const coachRecommendation = state.coach_messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.ai;
  const executionScore = Math.min(100, ((completedToday * 25) + Math.min(30, focusMinutesToday) + Math.min(20, (state.proof_count_today || 0) * 10)));
  const challenges = [
    { id: 'focus', title: 'Complete one 25-minute focus block', reward: 15, done: focusMinutesToday >= 25, action: () => pickBestOutcome() },
    { id: 'proof', title: 'Log proof before noon', reward: 15, done: (state.proof_count_today || 0) > 0, action: () => state.active_outcome_id ? logProof(state.active_outcome_id, 'Challenge proof note') : pushToast('No active outcome') },
    { id: 'workflow', title: 'Turn one outcome into a workflow', reward: 20, done: state.events.some((e) => e.content.includes('Converted active outcome')), action: () => state.active_outcome_id ? void convertOutcomeToWorkflow(state.active_outcome_id) : pushToast('Pick an outcome first') },
    { id: 'debrief', title: 'Close the day with a debrief', reward: 25, done: Boolean(state.report), action: () => generateReport() }
  ];

  function safeAction(label: string, handler?: () => void) {
    if (!handler) {
      console.warn(`[TaskPilot][Daily] Button "${label}" missing handler.`);
      return () => pushToast(`${label} coming soon.`);
    }
    return handler;
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge mb-2">Today&apos;s execution cockpit</p>
            <h1 className="text-3xl font-black">Daily Command Center</h1>
            <p className="mt-1 text-sm text-slate-400">{state.date} · Status: {state.status}</p>
            <p className="mt-1 text-xs text-slate-500">Execution streak: {state.streak ?? dailyStreak} · Completed today: {completedToday} · Focus minutes: {focusMinutesToday}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge">AI: {aiMode === 'openai' ? 'OpenAI' : 'Mock'}</span>
            <span className="badge">Sync: {syncLabel}</span>
            <span className="badge">Saved: {new Date(state.last_saved_at || nowIso()).toLocaleTimeString()}</span>
            <button className="btn-ghost btn-sm" onClick={safeAction('Plan today', openPlanModal)}>Plan today</button>
            <button className="btn-ghost btn-sm" onClick={() => setShowResetConfirm(true)}>Reset day</button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {(['outcomes', 'focus', 'coach', 'timeline', 'report'] as DailyTab[]).map((tab) => (
            <button key={tab} className={`btn-secondary btn-sm ${mobileTab === tab ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
        <div className="mb-4 grid gap-3">
          <DailyLoopProgress currentStep={loopStep} />
          <DailyScorecard
            executionScore={executionScore}
            focusMinutes={focusMinutesToday}
            outcomesCompleted={completedToday}
            outcomesTotal={Math.max(1, state.outcomes.length)}
            proofLogged={state.proof_count_today || 0}
            streak={state.streak ?? dailyStreak}
            xpToday={state.xp_today || 0}
            level={state.level || 1}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
          <div className={`${mobileTab === 'outcomes' ? 'block' : 'hidden'} lg:block`}>
            <div className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Today&apos;s Outcomes</h2>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={safeAction('Plan today', openPlanModal)}>Plan today</button>
                  <button className="btn-ghost btn-sm" onClick={safeAction('Add outcome', () => addOutcome())}>Add outcome</button>
                  <button className="btn-ghost btn-sm" onClick={safeAction('Improve this page', () => window.dispatchEvent(new CustomEvent('daily-improve-page')))}>Improve this page</button>
                </div>
              </div>
              {!state.outcomes.length ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">What are you trying to move forward today?</p>
                  <p className="mt-1 text-sm text-slate-400">Pick outcomes, not chores. A strong outcome has visible proof by end of day.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={safeAction('Build something', () => { setDayType('build'); addOutcome('Ship one useful improvement'); })}>Build something</button>
                    <button className="btn-secondary btn-sm" onClick={safeAction('Make money', () => { setDayType('money'); addOutcome('Send 10 sales or beta outreach messages'); })}>Make money</button>
                    <button className="btn-secondary btn-sm" onClick={safeAction('Clear blocker', () => addOutcome('Fix the biggest blocker in my current project'))}>Clear a blocker</button>
                    <button className="btn-ghost btn-sm" onClick={safeAction('Start from scratch', openPlanModal)}>Start from scratch</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.outcomes.map((outcome) => {
                    const quality = qualityLabel(outcome.quality_score || 0);
                    const isActive = state.active_outcome_id === outcome.id || outcome.status === 'active';
                    return (
                      <div key={outcome.id} className={`rounded-xl border p-3 ${isActive ? 'border-amber-400 bg-amber-400/10' : outcome.status === 'done' ? 'border-emerald-500/40 bg-emerald-400/10' : outcome.status === 'blocked' ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-700 bg-slate-950/40'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-white">#{outcome.priority} {outcome.title}</p>
                          <div className="flex gap-1">
                            <span className="badge">{outcome.category}</span>
                            {!!outcome.leverage_score && <span className="badge">Leverage {outcome.leverage_score}</span>}
                            {outcome.money_potential && outcome.money_potential !== 'none' && <span className="badge">Money {outcome.money_potential}</span>}
                          </div>
                        </div>
                        <p className="text-sm text-slate-400">{outcome.why_it_matters}</p>
                        <p className="text-xs text-slate-500">Status: {isActive ? 'active' : outcome.status} · Est {outcome.estimated_minutes}m · Actual {outcome.actual_minutes}m</p>
                        <p className="text-xs text-slate-500">Evidence: {outcome.proof_required} {outcome.proof_provided ? `· Logged: ${outcome.proof_provided}` : ''}</p>
                        <p className="text-xs text-slate-500">Quality: {quality}</p>
                        {(quality === 'Needs clarity' || quality === 'Too broad' || quality === 'Not proofable') && (
                          <button className="btn-ghost btn-sm mt-1" onClick={safeAction('Refine outcome', () => refineOutcome(outcome.id))}>Refine outcome</button>
                        )}
                        {outcome.status === 'blocked' && <p className="mt-1 text-xs text-amber-200">Blocked: {outcome.blocker_note || 'Missing blocker detail.'}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {outcome.status !== 'done' && <button className="btn-primary btn-sm" onClick={safeAction('Focus', () => startFocus(outcome.id))}>Focus</button>}
                          {outcome.status !== 'done' && <button className="btn-secondary btn-sm" onClick={safeAction('Done', () => completeOutcome(outcome.id))}>Done</button>}
                          {outcome.status !== 'done' && <button className="btn-secondary btn-sm" onClick={safeAction('Blocked', () => openBlockedModal(outcome.id))}>Blocked</button>}
                          <button className="btn-ghost btn-sm" onClick={safeAction('Log proof', () => logProof(outcome.id, prompt('Evidence note') || ''))}>Log evidence</button>
                          {outcome.status === 'done' && <button className="btn-ghost btn-sm" onClick={safeAction('Turn this into a lesson', () => openLessonModal(outcome.id))}>Turn this into a lesson</button>}
                          <button className="btn-ghost btn-sm" onClick={safeAction('Edit', () => openEditOutcome(outcome.id))}>Edit</button>
                          <button className="btn-ghost btn-sm" onClick={safeAction('Turn into workflow', () => void convertOutcomeToWorkflow(outcome.id))}>Turn into workflow</button>
                        </div>
                        {outcome.completed_at && <p className="mt-1 text-xs text-emerald-300">Completed {new Date(outcome.completed_at).toLocaleTimeString()}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={`${mobileTab === 'focus' ? 'block' : 'hidden'} lg:block`}>
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Current Mission</h2>
              {!activeFocus || activeFocus.status !== 'active' ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">No focus block running</p>
                  <p className="mt-1 text-sm text-slate-400">Pick one outcome to work now.</p>
                  <p className="mt-2 text-xs text-slate-500">Recommended: {recommendedOutcome?.title || 'No recommended outcome yet.'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={safeAction('Pick best next move', pickBestOutcome)}>Pick best next move</button>
                    <button className="btn-primary btn-sm" onClick={safeAction('Start focus block', () => recommendedOutcome && startFocus(recommendedOutcome.id))}>Start focus block</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Outcome:</span> {activeFocus.title}</p>
                  <p><span className="text-slate-500">Current action:</span> {activeFocus.current_action}</p>
                  <p><span className="text-slate-500">Proof needed:</span> {state.outcomes.find((o) => o.id === activeFocus.outcome_id)?.proof_required || 'Visible progress note'}</p>
                  <p><span className="text-slate-500">Elapsed:</span> {activeFocus.actual_minutes}m / {activeFocus.planned_minutes}m</p>
                  <p><span className="text-slate-500">Drift:</span> {activeFocus.drift_score > 5 ? 'High' : 'Stable'}</p>
                  <p><span className="text-slate-500">Checkpoint:</span> {new Date(activeFocus.last_progress_at).toLocaleTimeString()}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={safeAction('Complete action', () => { logEvent('completed_action', 'Focus action completed.'); pushToast('Focus action logged.'); })}>Complete action</button>
                    <button className="btn-secondary btn-sm" onClick={safeAction('Log proof', () => logProof(activeFocus.outcome_id, prompt('Evidence note') || 'Evidence logged'))}>Log evidence</button>
                    <button className="btn-secondary btn-sm" onClick={safeAction('Blocked', () => openBlockedModal(activeFocus.outcome_id))}>Blocked</button>
                    <button className="btn-ghost btn-sm" onClick={safeAction('Pause', () => { updateState((prev) => ({ ...prev, active_focus_block: prev.active_focus_block ? { ...prev.active_focus_block, status: 'paused' } : null })); logEvent('completed_action', 'Focus paused.'); })}>Pause</button>
                    <button className="btn-ghost btn-sm" onClick={safeAction('End focus', () => { updateState((prev) => ({ ...prev, active_focus_block: prev.active_focus_block ? { ...prev.active_focus_block, status: 'complete', ended_at: nowIso() } : null, status: 'planning', active_outcome_id: null })); logEvent('completed_action', 'Focus ended.'); })}>End focus</button>
                    <button className="btn-ghost btn-sm" onClick={safeAction('Turn into workflow', () => void convertOutcomeToWorkflow(activeFocus.outcome_id))}>Turn into workflow</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${mobileTab === 'coach' ? 'block' : 'hidden'} lg:block`}>
            <div className="card flex h-[520px] sm:h-[620px] flex-col p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Daily Copilot</h2>
              <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-amber-200">Coach recommendation</p>
                <p className="font-semibold text-white">{coachRecommendation?.next_action || 'Start one focus block on your highest-leverage outcome.'}</p>
                <p className="text-xs text-slate-300">Why: {coachRecommendation?.priority_reason || 'Single-task execution compounds faster than scattered effort.'}</p>
                <p className="text-xs text-slate-300">Timebox: {coachRecommendation?.focus_minutes || 25}m · Evidence: {coachRecommendation?.proof_needed || 'One visible artifact'}</p>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <button className="btn-secondary btn-sm" onClick={safeAction('Pick best next move', () => void sendCoachMessage('Based on daily state, pick best next move and why.'))}>Pick best next move</button>
                <button className="btn-ghost btn-sm" onClick={safeAction('Make it tiny', () => void sendCoachMessage('Make the active outcome tiny: one 5-minute action.'))}>Make it tiny</button>
                <button className="btn-ghost btn-sm" onClick={safeAction('Find money move', () => void sendCoachMessage('Find the best money move from current outcomes and give one immediate action.'))}>Find money move</button>
                <button className="btn-secondary btn-sm" onClick={safeAction('Close the day', generateReport)}>Close the day</button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                {state.coach_messages.map((m) => (
                  <div key={m.id} className={`rounded-xl p-2 text-sm ${m.role === 'assistant' ? 'bg-slate-800/80 text-slate-100' : 'bg-amber-400/10 text-amber-100'}`}>
                    <p className="text-xs uppercase tracking-widest text-slate-500">{m.role}</p>
                    <p>{m.content}</p>
                    {m.ai && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-xs text-slate-400">Next: {m.ai.next_action}</span>
                        {m.ai.recommended_outcome_id && <button className="btn-ghost btn-sm" onClick={safeAction('Start recommended focus', () => startFocus(m.ai!.recommended_outcome_id!))}>Start recommended focus</button>}
                        {state.active_outcome_id && <button className="btn-ghost btn-sm" onClick={safeAction('Mark active done', () => completeOutcome(state.active_outcome_id!))}>Mark active done</button>}
                        {state.active_outcome_id && <button className="btn-ghost btn-sm" onClick={safeAction('Create workflow from this', () => void convertOutcomeToWorkflow(state.active_outcome_id!))}>Create workflow from this</button>}
                      </div>
                    )}
                  </div>
                ))}
                {!state.coach_messages.length && <p className="text-sm text-slate-500">No coach messages yet. Ask what to do first.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for coaching..." onKeyDown={(e) => e.key === 'Enter' && void sendCoachMessage()} />
                <button className="btn-primary" onClick={safeAction('Send coach message', () => void sendCoachMessage())}>Send</button>
              </div>
            </div>
            <div className="card mt-4 p-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Daily challenges</h3>
              <div className="mt-2 space-y-2">
                {challenges.map((challenge) => (
                  <div key={challenge.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-sm">
                    <p className="font-semibold">{challenge.title}</p>
                    <p className="text-xs text-slate-500">Reward: +{challenge.reward} XP</p>
                    <button className="btn-ghost btn-sm mt-1" disabled={challenge.done} onClick={() => challenge.action()}>
                      {challenge.done ? 'Completed' : 'Start'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`${mobileTab === 'timeline' ? 'block' : 'hidden'} mt-5 lg:block`}>
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Progress Timeline</h2>
            <div className="space-y-1 text-sm text-slate-300">
              {shownEvents.map((event) => (
                <p key={event.id}>
                  {new Date(event.created_at).toLocaleTimeString()} · {
                    event.type === 'generated_top3' ? 'Plan created'
                      : event.type === 'created_outcome' ? 'Outcome added'
                      : event.type === 'started_focus' ? 'Focus started'
                      : event.type === 'proof_added' ? 'Evidence logged'
                      : event.type === 'completed_outcome' ? 'Outcome completed'
                      : event.type === 'report_generated' ? 'Day closed'
                      : event.type === 'blocked' ? 'Blocked'
                      : 'Progress logged'
                  } · {event.content}
                </p>
              ))}
              {!state.events.length && <p className="text-slate-500">No progress logged yet. Start a focus block or mark an outcome complete.</p>}
            </div>
            {state.events.length > 10 && <button className="btn-ghost btn-sm mt-2" onClick={() => setShowAllEvents((prev) => !prev)}>{showAllEvents ? 'View latest 10' : 'View all'}</button>}
          </div>
        </div>

        <div className={`${mobileTab === 'report' ? 'block' : 'hidden'} mt-5 lg:block`}>
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Daily Debrief</h2>
            {state.report ? (
              <>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Summary:</span> {state.report.summary}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Completed:</span> {state.report.completed_outcomes.map((o) => o.title).join(', ') || 'none'}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Blocked:</span> {state.report.blocked_outcomes.map((o) => o.title).join(', ') || 'none'}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Focus minutes:</span> {state.report.total_focus_minutes}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Biggest win:</span> {state.report.wins[0] || 'n/a'}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Biggest leak:</span> {state.report.leaks[0] || 'n/a'}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Execution score:</span> {state.report.execution_score}/10</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Money score:</span> {state.report.money_score}/10</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Tomorrow first action:</span> {state.report.tomorrow_first_action}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <textarea className="input min-h-16" placeholder="What moved forward today?" value={reflectionDraft.moved_forward} onChange={(e) => setReflectionDraft((p) => ({ ...p, moved_forward: e.target.value }))} />
                  <textarea className="input min-h-16" placeholder="What created evidence?" value={reflectionDraft.proof_created} onChange={(e) => setReflectionDraft((p) => ({ ...p, proof_created: e.target.value }))} />
                  <textarea className="input min-h-16" placeholder="What leaked time?" value={reflectionDraft.time_leak} onChange={(e) => setReflectionDraft((p) => ({ ...p, time_leak: e.target.value }))} />
                  <textarea className="input min-h-16" placeholder="What should be repeated?" value={reflectionDraft.repeat} onChange={(e) => setReflectionDraft((p) => ({ ...p, repeat: e.target.value }))} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary btn-sm" onClick={safeAction('Copy report', () => navigator.clipboard.writeText(JSON.stringify(state.report, null, 2)))}>Copy report</button>
                  <button className="btn-secondary btn-sm" onClick={safeAction('Carry unfinished to tomorrow', carryForward)}>Carry unfinished to tomorrow</button>
                  <button className="btn-ghost btn-sm" onClick={safeAction('Start tomorrow from this', carryForward)}>Start tomorrow from this</button>
                  <button className="btn-ghost btn-sm" onClick={safeAction('Save report', () => pushToast('Report saved locally.'))}>Save report</button>
                  <button className="btn-ghost btn-sm" onClick={safeAction('Save lesson', () => state.outcomes.find((o) => o.status === 'done') ? openLessonModal(state.outcomes.find((o) => o.status === 'done')!.id) : pushToast('Complete one outcome to save lesson'))}>Save lesson</button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">No report yet</p>
                <p className="mt-1 text-sm text-slate-400">Close your day with wins, leaks, carry-forward outcomes, and next action.</p>
                <button className="btn-primary btn-sm mt-3" onClick={safeAction('Close the day', generateReport)}>Close the day</button>
              </div>
            )}
          </div>
        </div>

        {!!state.lessons?.length && (
          <div className="mt-5 card p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Lessons captured today</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {state.lessons.slice(0, 4).map((lesson) => (
                <LearningCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </div>
        )}

        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowPlanModal(false)}>
            <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">{showPlanReview ? 'Review Today\'s Plan' : 'What kind of day are you planning?'}</h2>
              {!showPlanReview && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['build', 'money', 'admin', 'learning', 'personal', 'custom'] as DayType[]).map((type) => (
                      <button
                        key={type}
                        aria-pressed={selectedDayType === type}
                        className={`rounded-xl border px-3 py-2 text-sm capitalize transition ${
                          selectedDayType === type
                            ? 'border-yellow-500 bg-yellow-500/15 text-yellow-100 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]'
                            : 'border-slate-700 bg-slate-950/40 text-slate-300'
                        }`}
                        onClick={() => { setSelectedDayType(type); setDayType(type); setPlanWarning(''); }}
                      >
                        {selectedDayType === type ? '● ' : ''}{type}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {selectedDayType === 'build' && 'Ship, fix, design, or improve something tangible.'}
                    {selectedDayType === 'money' && 'Outreach, follow-up, offers, invoices, sales assets, or revenue actions.'}
                    {selectedDayType === 'admin' && 'Clear overdue tasks, organize systems, document processes, close loops.'}
                    {selectedDayType === 'learning' && 'Learn one concept and produce proof: notes, checklist, demo, or artifact.'}
                    {selectedDayType === 'personal' && 'Health, home, life maintenance, clarity, or personal execution.'}
                    {selectedDayType === 'custom' && 'Use your own context. TaskPilot will turn it into proof-backed outcomes.'}
                    {!selectedDayType && 'Choose a day type to shape your plan.'}
                  </p>
                  <textarea className="input mt-3 min-h-24" value={customDirection} onChange={(e) => setCustomDirection(e.target.value)} placeholder="What is on your mind today?" />
                  {selectedDayType === 'build' && (
                    <button
                      className="btn-ghost btn-sm mt-2"
                      onClick={() => {
                        const now = nowIso();
                        setProposedOutcomes([
                          { ...makeOutcome('Fix one visible UX issue', 0), first_action: 'Identify the exact page/component.', proof_required: 'Before/after screenshot' , created_at: now, updated_at: now},
                          { ...makeOutcome('Ship one product-loop improvement', 1), first_action: 'Define smallest improvement to Daily loop.', proof_required: 'Commit or deployed change', created_at: now, updated_at: now},
                          { ...makeOutcome('Test one user journey end-to-end', 2), first_action: 'Choose one journey and run it.', proof_required: 'Test notes or screen recording', created_at: now, updated_at: now}
                        ]);
                        setShowPlanReview(true);
                      }}
                    >
                      Use TaskPilot improvement template
                    </button>
                  )}
                </>
              )}
              {showPlanReview && (
                <div className="mt-3 grid gap-2">
                  {proposedOutcomes.map((outcome) => (
                    <div key={outcome.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                      <p className="font-semibold">{outcome.title}</p>
                      <p className="text-xs text-slate-500">First action: {outcome.first_action}</p>
                      <p className="text-xs text-slate-500">Evidence: {outcome.proof_required}</p>
                      <p className="text-xs text-slate-500">Est: {outcome.estimated_minutes}m · Value {outcome.value_score} · Leverage {outcome.leverage_score}</p>
                    </div>
                  ))}
                </div>
              )}
              {!!planWarning && <p className="mt-2 text-sm text-amber-200">{planWarning}</p>}
              {isGeneratingPlan && <p className="mt-2 text-sm text-slate-300">Building today&apos;s execution plan... {generationStage}</p>}
              <div className="mt-3 flex gap-2">
                {!showPlanReview ? (
                  <>
                    <button className="btn-primary" disabled={isGeneratingPlan} onClick={safeAction('Plan today', () => void proposePlan())}>Plan today</button>
                    <button className="btn-ghost" onClick={() => setShowPlanModal(false)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" onClick={() => acceptProposedOutcomesWithMode('replace')}>Accept plan</button>
                    <button className="btn-secondary" onClick={() => void proposePlan()}>Regenerate</button>
                    <button className="btn-ghost" onClick={() => setShowPlanReview(false)}>Edit manually</button>
                    <button className="btn-ghost" onClick={() => setShowPlanModal(false)}>Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {editingOutcomeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setEditingOutcomeId(null)}>
            <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Edit outcome</h2>
              <input className="input mt-3" value={editingDraft.title || ''} onChange={(e) => setEditingDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" />
              <textarea className="input mt-2 min-h-20" value={editingDraft.why_it_matters || ''} onChange={(e) => setEditingDraft((prev) => ({ ...prev, why_it_matters: e.target.value }))} placeholder="Why it matters" />
              <input className="input mt-2" value={editingDraft.proof_required || ''} onChange={(e) => setEditingDraft((prev) => ({ ...prev, proof_required: e.target.value }))} placeholder="Proof required" />
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={safeAction('Save edit', saveOutcomeEdit)}>Save</button>
                <button className="btn-ghost" onClick={() => setEditingOutcomeId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {blockerModalOutcomeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setBlockerModalOutcomeId(null)}>
            <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">What exactly is blocking this?</h2>
              <textarea className="input mt-3 min-h-24" value={blockerNote} onChange={(e) => setBlockerNote(e.target.value)} />
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={safeAction('Save blocker', saveBlockedOutcome)}>Save blocker</button>
                <button className="btn-ghost" onClick={() => setBlockerModalOutcomeId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {lessonSourceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setLessonSourceId(null)}>
            <div className="card w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Turn this into a lesson</h2>
              <input className="input mt-3" placeholder="Lesson title" value={lessonDraft.lesson_title} onChange={(e) => setLessonDraft((p) => ({ ...p, lesson_title: e.target.value }))} />
              <textarea className="input mt-2 min-h-16" placeholder="What I did / learned" value={lessonDraft.summary} onChange={(e) => setLessonDraft((p) => ({ ...p, summary: e.target.value }))} />
              <textarea className="input mt-2 min-h-16" placeholder="Mistake or blocker to avoid" value={lessonDraft.mistake_or_blocker} onChange={(e) => setLessonDraft((p) => ({ ...p, mistake_or_blocker: e.target.value }))} />
              <input className="input mt-2" placeholder="Repeatable rule" value={lessonDraft.principle} onChange={(e) => setLessonDraft((p) => ({ ...p, principle: e.target.value }))} />
              <input className="input mt-2" placeholder="Next time checklist action" value={lessonDraft.next_time_action} onChange={(e) => setLessonDraft((p) => ({ ...p, next_time_action: e.target.value }))} />
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={safeAction('Save lesson', saveLesson)}>Save lesson</button>
                <button className="btn-ghost" onClick={() => setLessonSourceId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showReplacePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowReplacePrompt(false)}>
            <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Existing outcomes found</h2>
              <p className="mt-1 text-sm text-slate-400">Replace today&apos;s existing outcomes or append to them?</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={() => acceptProposedOutcomesWithMode('replace')}>Replace outcomes</button>
                <button className="btn-secondary" onClick={() => acceptProposedOutcomesWithMode('append')}>Append outcomes</button>
                <button className="btn-ghost" onClick={() => setShowReplacePrompt(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowResetConfirm(false)}>
            <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Reset day</h2>
              <p className="mt-1 text-sm text-slate-400">This clears today&apos;s outcomes, focus blocks, timeline, and report for this device/account. Continue?</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-danger" onClick={() => { setState(buildInitialState(today)); setShowResetConfirm(false); pushToast('Day reset.'); }}>Reset day</button>
                <button className="btn-ghost" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
