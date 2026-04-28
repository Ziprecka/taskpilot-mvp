'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DailyLoopProgress } from '@/components/DailyLoopProgress';
import { DailyScorecard } from '@/components/DailyScorecard';
import { LearningCard } from '@/components/LearningCard';
import { ProofModal } from '@/components/ProofModal';
import { RewardMoment } from '@/components/RewardMoment';
import { Nav } from '@/components/Nav';
import { PlanBuilder } from '@/components/PlanBuilder';
import { useToast } from '@/components/ToastProvider';
import { DailyHeader } from '@/components/daily/DailyHeader';
import { DeskBotStatusCard } from '@/components/daily/DeskBotStatusCard';
import { DailyGoalIntake } from '@/components/daily/DailyGoalIntake';
import { DailyDebriefCard } from '@/components/daily/DailyDebriefCard';
import { DailyPlanPreview } from '@/components/daily/DailyPlanPreview';
import { TodayMissionQueue } from '@/components/daily/TodayMissionQueue';
import { CurrentMissionPanel } from '@/components/daily/CurrentMissionPanel';
import { NextMovePanel } from '@/components/daily/NextMovePanel';
import { DailyTimeline } from '@/components/daily/DailyTimeline';
import { addRecentActivity } from '@/lib/activity';
import { trackProductEvent } from '@/lib/productEvents';
import { trackEvent } from '@/lib/trackEvent';
import { getDailyStorageKey, getReportsStorageKey, getUserProgressionStorageKey } from '@/lib/storage';
import { saveGeneratedWorkflow } from '@/lib/workflowPersistence';
import { DEFAULT_ROBOT_ID, ROBOT_API_KEY_LS, ROBOT_ID_LS, secondsAgoLabel } from '@/lib/robotClientSettings';
import { syncRobotRelevantDailyState } from '@/lib/robotSync';
import { TODAY_BUTTON_AUDIT } from '@/lib/buttonAudit';
import type { PlanBuilderOutput } from '@/types/planBuilder';
import type { DailyAIResponse, DailyCommandState, DailyCoachMessage, DailyDebrief, DailyEvent, DailyOutcome, DailyProofItem, DailyReport, FocusBlock, LearningCard as LearningCardType, UserProgression, Workflow } from '@/types/workflow';

type DayType = NonNullable<DailyCommandState['selected_day_type']>;
type DailyTab = 'outcomes' | 'focus' | 'coach' | 'timeline' | 'report';

type PlanAcceptMeta = { daily_goals: string; detected_work_type: string; plan: PlanBuilderOutput };

type OutcomeQuality = {
  clarity: number;
  realism: number;
  proofability: number;
  daily_scope: number;
  value: number;
  issues: string[];
  rewrite_suggestion: string;
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

function sortDailyOutcomes(outcomes: DailyOutcome[], activeOutcomeId: string | null) {
  const rank = (status: DailyOutcome['status'], id: string) => {
    if (activeOutcomeId && id === activeOutcomeId) return 1;
    if (status === 'active') return 1;
    if (status === 'planned' || status === 'selected') return 2;
    if (status === 'blocked') return 3;
    if (status === 'done') return 4;
    return 5;
  };
  return [...outcomes].sort((a, b) => {
    const diff = rank(a.status, a.id) - rank(b.status, b.id);
    if (diff !== 0) return diff;
    if (a.status === 'done' && b.status === 'done') return String(b.completed_at || '').localeCompare(String(a.completed_at || ''));
    if ((a.status === 'planned' || a.status === 'selected') && (b.status === 'planned' || b.status === 'selected')) {
      return (b.leverage_score || 0) - (a.leverage_score || 0) || String(b.created_at).localeCompare(String(a.created_at));
    }
    return String(b.created_at).localeCompare(String(a.created_at));
  });
}

function buildInitialState(date: string): DailyCommandState {
  return {
    date,
    status: 'planning',
    daily_goals: '',
    selected_day_type: null,
    custom_context: '',
    outcomes: [],
    active_outcome_id: null,
    active_focus_block: null,
    events: [],
    coach_messages: [],
    report: null,
    debrief: null,
    closed_xp_awarded: false,
    xp_today: 0,
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
  const [planBuilderModalOpen, setPlanBuilderModalOpen] = useState(false);
  const [dailyGoalsInput, setDailyGoalsInput] = useState('');
  const [planReplaceBuffer, setPlanReplaceBuffer] = useState<{ outcomes: DailyOutcome[]; meta: PlanAcceptMeta } | null>(null);
  const [customDirection, setCustomDirection] = useState('');
  const [dayType, setDayType] = useState<DayType>('personal');
  const [selectedDayType, setSelectedDayType] = useState<DayType | null>(null);
  const [showReplacePrompt, setShowReplacePrompt] = useState(false);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<DailyOutcome>>({});
  const [blockerModalOutcomeId, setBlockerModalOutcomeId] = useState<string | null>(null);
  const [blockerNote, setBlockerNote] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [proofTargetOutcomeId, setProofTargetOutcomeId] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ title: '', xp: 0, copy: '', next: '' });
  const [showCompleteWithoutProof, setShowCompleteWithoutProof] = useState<string | null>(null);
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [copilotMode, setCopilotMode] = useState<'action' | 'draft' | 'blocked'>('action');
  const [copilotArtifact, setCopilotArtifact] = useState('');
  const [showCoachHistory, setShowCoachHistory] = useState(false);
  const [showCompletedExpanded, setShowCompletedExpanded] = useState(false);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [playbookLimitModalOpen, setPlaybookLimitModalOpen] = useState(false);
  const [betaAdmin, setBetaAdmin] = useState(false);
  const [deskBotMeta, setDeskBotMeta] = useState<{ online?: boolean; last_heartbeat_at?: string | null } | null>(null);
  const [deskBotState, setDeskBotState] = useState<{ mission?: string; next_move?: string; button_hint?: string } | null>(null);
  const [deskBotConfigured, setDeskBotConfigured] = useState(false);
  const [deskBotUiTick, setDeskBotUiTick] = useState(0);
  const [deskBotSyncStatus, setDeskBotSyncStatus] = useState<'synced' | 'waiting' | 'fallback' | 'error'>('waiting');
  const [progression, setProgression] = useState<UserProgression>({
    total_xp: 0,
    level: 1,
    current_streak: 0,
    best_streak: 0,
    completed_outcomes_total: 0,
    proof_logged_total: 0,
    reports_generated_total: 0,
    last_active_date: null
  });
  const [workflowDraftSourceId, setWorkflowDraftSourceId] = useState<string | null>(null);
  const [workflowDraft, setWorkflowDraft] = useState({
    workflow_name: '',
    goal: '',
    desired_result: '',
    context: '',
    proof_required: '',
    step_count: 7 as 5 | 7 | 10,
    style: 'guided mode' as 'fast checklist' | 'guided mode' | 'proof mode' | 'SOP mode',
    generated: null as Workflow | null
  });
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
  const [debriefFields, setDebriefFields] = useState({
    biggest_win: '',
    biggest_leak: '',
    carry_forward: '',
    tomorrow_first_move: ''
  });

  const [queuedPlaybookByOutcome, setQueuedPlaybookByOutcome] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          ...buildInitialState(today),
          ...parsed,
          xp_today: parsed?.xp_today ?? 0,
          proof_count_today: parsed?.proof_count_today ?? 0,
          proof_items: Array.isArray(parsed?.proof_items) ? parsed.proof_items : [],
          lessons: Array.isArray(parsed?.lessons) ? parsed.lessons : []
        });
        if (parsed?.selected_day_type) {
          setDayType(parsed.selected_day_type);
          setSelectedDayType(parsed.selected_day_type);
        }
        if (parsed?.custom_context) setCustomDirection(parsed.custom_context);
      }
      const progressionRaw = localStorage.getItem(getUserProgressionStorageKey());
      if (progressionRaw) setProgression({ ...progression, ...JSON.parse(progressionRaw) });
    } catch {
      setState(buildInitialState(today));
    }
    void fetch('/api/health').then((res) => res.json()).then((health) => {
      setAiMode(health?.env?.hasOpenAIKey ? 'openai' : 'mock');
      setSyncLabel(health?.env?.supabaseEnabled ? 'Synced' : 'Local');
    }).catch(() => null);
  }, [storageKey, today]);

  function mapWorkTypeToDayType(work: string): DayType {
    switch (work) {
      case 'service_day':
      case 'sales_day':
      case 'client_work_day':
        return 'money';
      case 'app_build':
      case 'hardware_setup':
        return 'build';
      case 'learning':
        return 'learning';
      case 'admin':
        return 'admin';
      case 'personal':
        return 'personal';
      default:
        return 'custom';
    }
  }

  function commitDailyPlan(outcomes: DailyOutcome[], meta: PlanAcceptMeta, mode: 'replace' | 'append') {
    const nm = meta.plan.next_move;
    updateState((prev) => ({
      ...prev,
      daily_goals: meta.daily_goals,
      detected_work_type: meta.detected_work_type,
      plan_title_snapshot: meta.plan.plan_title,
      plan_next_move_hint: {
        move: nm.next_move || '',
        where: nm.go_here || '',
        do: nm.write_make_do || nm.next_action || '',
        proof: nm.proof_needed || '',
        timebox: nm.suggested_focus_minutes ?? 10,
        avoid: nm.avoid || ''
      },
      selected_day_type: mapWorkTypeToDayType(meta.detected_work_type),
      custom_context: meta.daily_goals,
      status: 'planning',
      outcomes: (mode === 'append'
        ? [...prev.outcomes, ...outcomes]
        : [...prev.outcomes.filter((o) => o.status === 'done'), ...outcomes]
      ).slice(0, 6).map((item, idx) => ({ ...item, priority: Math.min(3, idx + 1) as 1 | 2 | 3 }))
    }));
    logEvent('generated_top3', `Plan Builder: ${meta.detected_work_type}`);
    void trackProductEvent('daily_plan_created', '/daily', { dayType: meta.detected_work_type, count: outcomes.length });
    void trackEvent('daily_plan_accepted', { dayType: meta.detected_work_type, count: outcomes.length });
    awardXP(10, 'Plan created', 'small');
    pushToast('Daily plan accepted.');
    setPlanReplaceBuffer(null);
    setShowReplacePrompt(false);
  }

  function openPlanModal() {
    setDailyGoalsInput(state.daily_goals || '');
    setPlanBuilderModalOpen(true);
  }

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ ...state, last_saved_at: nowIso() }));
  }, [storageKey, state]);

  useEffect(() => {
    localStorage.setItem(getUserProgressionStorageKey(), JSON.stringify(progression));
  }, [progression]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function refreshDeskConfig() {
      setDeskBotConfigured(Boolean(localStorage.getItem(ROBOT_API_KEY_LS)));
    }
    refreshDeskConfig();
    window.addEventListener('focus', refreshDeskConfig);
    window.addEventListener('storage', refreshDeskConfig);
    return () => {
      window.removeEventListener('focus', refreshDeskConfig);
      window.removeEventListener('storage', refreshDeskConfig);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setDeskBotUiTick((n) => n + 1), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = localStorage.getItem(ROBOT_API_KEY_LS);
    const rid = localStorage.getItem(ROBOT_ID_LS) || DEFAULT_ROBOT_ID;
    setDeskBotSyncStatus('waiting');
    void syncRobotRelevantDailyState(null, state, rid).then((res) => {
      if (!res.ok) return setDeskBotSyncStatus('error');
      const source = String((res.data as { state?: { source?: string } })?.state?.source || '');
      setDeskBotSyncStatus(source === 'fallback' ? 'fallback' : 'synced');
    });
    if (!key) return;
    const timeout = window.setTimeout(() => {
      void fetch('/api/robot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-taskpilot-robot-key': key },
        body: JSON.stringify({ robot_id: rid, daily_snapshot: state })
      })
        .then((r) => r.json())
        .then((data: { meta?: { online?: boolean; last_heartbeat_at?: string | null }; state?: { mission?: string; next_move?: string; button_hint?: string; source?: string } }) => {
          if (data?.meta) setDeskBotMeta(data.meta);
          if (data?.state) setDeskBotState(data.state);
          const source = String(data?.state?.source || '');
          setDeskBotSyncStatus(source === 'fallback' ? 'fallback' : 'waiting');
        })
        .catch(() => setDeskBotSyncStatus('error'));
    }, 2200);
    return () => clearTimeout(timeout);
  }, [state]);

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
    if (state.active_focus_block?.status === 'active') setCopilotMode('action');
  }, [state.active_focus_block?.status]);


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
      openProofModal(state.active_outcome_id);
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
    function onCreatePlaybook() {
      if (state.active_outcome_id) openWorkflowDraft(state.active_outcome_id);
      else pushToast('Pick an outcome first.');
    }
    window.addEventListener('daily-add-outcome', onAddOutcome as EventListener);
    window.addEventListener('daily-plan-today', onPlanToday as EventListener);
    window.addEventListener('daily-start-focus', onStartFocus as EventListener);
    window.addEventListener('daily-log-proof', onLogProof as EventListener);
    window.addEventListener('daily-generate-report', onGenerateReport as EventListener);
    window.addEventListener('daily-save-lesson', onSaveLesson as EventListener);
    window.addEventListener('daily-improve-page', onImprovePage as EventListener);
    window.addEventListener('daily-create-playbook', onCreatePlaybook as EventListener);
    return () => {
      window.removeEventListener('daily-add-outcome', onAddOutcome as EventListener);
      window.removeEventListener('daily-plan-today', onPlanToday as EventListener);
      window.removeEventListener('daily-start-focus', onStartFocus as EventListener);
      window.removeEventListener('daily-log-proof', onLogProof as EventListener);
      window.removeEventListener('daily-generate-report', onGenerateReport as EventListener);
      window.removeEventListener('daily-save-lesson', onSaveLesson as EventListener);
      window.removeEventListener('daily-improve-page', onImprovePage as EventListener);
      window.removeEventListener('daily-create-playbook', onCreatePlaybook as EventListener);
    };
  }, [state.outcomes.length, state.active_outcome_id]);

  function updateState(mutator: (prev: DailyCommandState) => DailyCommandState) {
    setState((prev) => ({ ...mutator(prev), last_saved_at: nowIso() }));
  }

  function logEvent(type: DailyEvent['type'], content: string) {
    updateState((prev) => ({ ...prev, events: [{ id: crypto.randomUUID(), type, content, created_at: nowIso() }, ...prev.events].slice(0, 200) }));
  }

  function awardXP(amount: number, reason: string, rewardType: 'small' | 'big' = 'small') {
    let didLevelUp = false;
    setProgression((prev) => {
      const total = prev.total_xp + amount;
      const nextLevel = Math.floor(total / 100) + 1;
      didLevelUp = nextLevel > prev.level;
      return { ...prev, total_xp: total, level: nextLevel };
    });
    updateState((prev) => ({ ...prev, xp_today: (prev.xp_today || 0) + amount }));
    pushToast(`+${amount} XP ${reason}`);
    if (rewardType === 'big') {
      setRewardData({ title: reason, xp: amount, copy: 'Progress locked in with proof-backed execution.', next: 'Take the next smallest action now.' });
      setShowReward(true);
    }
    if (didLevelUp) {
      setRewardData({
        title: 'Level up',
        xp: 0,
        copy: `You reached level ${Math.floor((progression.total_xp + amount) / 100) + 1}.`,
        next: 'Push one more concrete action.'
      });
      setShowReward(true);
    }
    logEvent('completed_action', `XP earned: +${amount} (${reason})`);
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
      first_action: 'Write the smallest physical next step (tool + location + artifact) for this outcome.',
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
    awardXP(10, 'Plan created', 'small');
    pushToast('Outcome added.');
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
    void trackEvent('mission_started', { outcome_id: outcome.id, title: outcome.title });
    awardXP(5, 'Focus started', 'small');
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
      setShowCompleteWithoutProof(id);
      return;
    }
    updateState((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((o) => o.id === id ? { ...o, status: 'done', completed_at: nowIso(), updated_at: nowIso() } : o),
      active_focus_block: prev.active_focus_block?.outcome_id === id ? { ...prev.active_focus_block, status: 'complete', ended_at: nowIso() } : prev.active_focus_block,
      active_outcome_id: prev.active_outcome_id === id ? null : prev.active_outcome_id,
      plan_next_move_hint: undefined
    }));
    logEvent('completed_outcome', `Outcome completed: ${target.title}`);
    void trackEvent('mission_completed', { outcome_id: target.id, title: target.title });
    addRecentActivity({ type: 'daily_outcome_completed', title: target.title, route: '/daily' });
    setProgression((prev) => ({ ...prev, completed_outcomes_total: prev.completed_outcomes_total + 1 }));
    awardXP(25, 'Outcome complete', 'big');
    if (target.linked_session_id && target.linked_step_number) {
      const shouldMarkStep = window.confirm('Also mark linked playbook step complete?');
      if (shouldMarkStep) {
        try {
          const keys = Object.keys(localStorage).filter((key) => key.startsWith('taskpilot-session-'));
          for (const key of keys) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (String(parsed?.session?.id || '').includes(target.linked_session_id)) {
              const completed = Array.from(new Set([...(parsed.session?.completed_steps || []), target.linked_step_number]));
              const next = {
                ...parsed,
                session: {
                  ...parsed.session,
                  completed_steps: completed,
                  current_step: Math.max(parsed.session?.current_step || 1, target.linked_step_number + 1),
                  updated_at: nowIso()
                }
              };
              localStorage.setItem(key, JSON.stringify(next));
              break;
            }
          }
        } catch {
          // ignore linked step update failure
        }
      }
    }
    if (state.outcomes.filter((o) => o.status === 'done').length + 1 >= state.outcomes.length && state.outcomes.length > 0) {
      setRewardData({ title: 'Today\'s outcomes complete.', xp: 30, copy: 'You finished all planned outcomes.', next: 'Close the day with a debrief.' });
      setShowReward(true);
    }
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
    void trackEvent('proof_logged', { outcome_id: id });
    updateState((prev) => ({ ...prev, proof_count_today: (prev.proof_count_today || 0) + 1 }));
    setProgression((prev) => ({ ...prev, proof_logged_total: prev.proof_logged_total + 1 }));
    awardXP(15, 'Evidence logged', 'big');
    pushToast('Proof logged.');
  }

  function openProofModal(outcomeId?: string | null) {
    const targetId = outcomeId || state.active_outcome_id;
    if (!targetId) return pushToast('Pick an outcome first.');
    setProofTargetOutcomeId(targetId);
  }

  function saveProofItem(item: DailyProofItem) {
    const proofText = item.note || item.file_name || 'Proof added';
    updateState((prev) => ({
      ...prev,
      proof_items: [item, ...(prev.proof_items || [])].slice(0, 200),
      outcomes: prev.outcomes.map((o) => o.id === item.outcome_id ? { ...o, proof_provided: proofText, updated_at: nowIso() } : o)
    }));
    logEvent('proof_added', 'Proof logged');
    void trackProductEvent('proof_logged', '/daily', { outcome_id: item.outcome_id, type: item.type });
    void trackEvent('proof_logged', { outcome_id: item.outcome_id, type: item.type });
    updateState((prev) => ({ ...prev, proof_count_today: (prev.proof_count_today || 0) + 1 }));
    setProgression((prev) => ({ ...prev, proof_logged_total: prev.proof_logged_total + 1 }));
    awardXP(15, 'Proof logged', 'big');
    setProofTargetOutcomeId(null);
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

  function openWorkflowDraft(id: string) {
    const outcome = state.outcomes.find((o) => o.id === id);
    if (!outcome) return;
    if (queuedPlaybookByOutcome[id]) {
      const proceed = window.confirm('Already created from this outcome. Create another playbook?');
      if (!proceed) return;
    }
    setWorkflowDraftSourceId(id);
    setWorkflowDraft({
      workflow_name: `${outcome.title} Playbook`,
      goal: outcome.title,
      desired_result: outcome.why_it_matters || 'Concrete daily outcome with proof.',
      context: outcome.first_action || '',
      proof_required: outcome.proof_required || '',
      step_count: 7,
      style: 'guided mode',
      generated: null
    });
  }

  async function convertOutcomeToWorkflow(id: string) {
    const outcome = state.outcomes.find((o) => o.id === id);
    if (!outcome) return;
    const res = await fetch('/api/workflows/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: workflowDraft.goal || outcome.title,
        category: outcome.category === 'money' ? 'business_sop' : outcome.category === 'build' ? 'coding' : 'productivity',
        desired_outcome: workflowDraft.desired_result || outcome.why_it_matters,
        context: workflowDraft.context,
        proof_required: workflowDraft.proof_required,
        steps_count: workflowDraft.step_count,
        output_style: workflowDraft.style,
      prompt: 'Turn this daily outcome into a concrete playbook with steps that can be executed and verified.'
      })
    });
    const payload = await res.json();
    if (!payload?.ok && payload?.code === 'playbook_generation_limit') {
      setPlaybookLimitModalOpen(true);
      return;
    }
    if (payload?.beta_admin) setBetaAdmin(true);
    const raw = payload?.workflow;
    if (!raw) return pushToast('Could not convert outcome right now.');
    const wf: Workflow = {
      id: raw.id || raw.slug || outcome.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      workflow_name: raw.workflow_name || `${outcome.title} Playbook`,
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
    setWorkflowDraft((prev) => ({ ...prev, generated: wf }));
  }

  function finalizeWorkflowFromDraft(action: 'start' | 'save' | 'edit') {
    const generated = workflowDraft.generated;
    if (!generated) return;
    try {
      const existingRaw = localStorage.getItem('taskpilot-generated-workflows');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const duplicate = Array.isArray(existing) && existing.some((wf: Workflow) => String(wf?.workflow_name || '').toLowerCase() === generated.workflow_name.toLowerCase());
      if (duplicate && !window.confirm('A playbook with this name already exists. Save duplicate anyway?')) return;
    } catch {
      // ignore duplicate check errors
    }
    saveGeneratedWorkflow(generated);
    addRecentActivity({ type: 'workflow_generated', title: `Created playbook from outcome: ${generated.workflow_name}`, route: `/session/${generated.id}` });
    logEvent('completed_action', 'Created playbook from active outcome.');
    awardXP(15, 'Playbook created', 'small');
    pushToast('Playbook created from today\'s outcome.');
    if (workflowDraftSourceId) setQueuedPlaybookByOutcome((prev) => ({ ...prev, [workflowDraftSourceId]: generated.id }));
    setWorkflowDraftSourceId(null);
    if (action === 'start') router.push(`/session/${generated.id}`);
    if (action === 'edit') router.push('/workflows/generate');
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
    awardXP(10, 'Lesson captured', 'small');
    pushToast('Lesson saved.');
  }

  async function sendCoachMessage(promptOverride?: string) {
    const content = (promptOverride ?? input).trim();
    if (!content) return;
    setInput('');
    setIsCoachLoading(true);
    const userMsg: DailyCoachMessage = { id: crypto.randomUUID(), role: 'user', content, created_at: nowIso() };
    updateState((prev) => ({ ...prev, coach_messages: [...prev.coach_messages, userMsg].slice(-80) }));
    logEvent('coach_message_sent', `Coach: ${content.slice(0, 60)}`);
    try {
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
          xp_state: { total_xp: progression.total_xp, xp_today: state.xp_today || 0, streak: progression.current_streak, level: progression.level },
          copilot_mode: copilotMode,
          fullState: state
        })
      });
      const payload = await res.json();
      const ai: DailyAIResponse = payload?.data;
    const textBlob = `${ai?.next_move || ''} ${ai?.go_here || ''} ${ai?.write_make_do || ''} ${ai?.proof_needed || ''} ${ai?.direct_answer || ''}`.toLowerCase();
    const stateBlob = JSON.stringify({
      outcomes: state.outcomes.map((o) => o.title.toLowerCase()),
      active: state.active_focus_block?.title?.toLowerCase() || '',
      message: content.toLowerCase()
    });
    const hasConcreteVerb = /(open|write|send|upload|test|record|screenshot|publish|commit|copy|start|log)/i.test(textBlob);
    const hasProof = Boolean((ai?.proof_needed || '').trim());
    const staleTopic = /(spy|trading|stock|options)/i.test(textBlob) && !/(spy|trading|stock|options)/i.test(stateBlob);
    const tooLong = textBlob.split(/\s+/).filter(Boolean).length > 80;
    const touchesState = state.outcomes.length === 0 || state.outcomes.some((o) => textBlob.includes(o.title.toLowerCase().slice(0, 20))) || textBlob.includes('focus') || textBlob.includes('plan');
    const aiInvalid = !touchesState || !hasConcreteVerb || !hasProof || staleTopic || tooLong;
    const fallbackMove =
      state.active_focus_block?.status === 'active'
        ? {
            next_move: 'Finish current focus action.',
            go_here: 'Current Mission card',
            write_make_do: state.active_focus_block.current_action || 'Complete one action now.',
            proof_needed: state.outcomes.find((o) => o.id === state.active_focus_block?.outcome_id)?.proof_required || 'Screenshot or note.',
            timebox_minutes: 5,
            avoid: 'Do not switch tasks.',
            suggested_action: 'start_focus' as const
          }
        : state.outcomes.find((o) => o.status === 'planned' || o.status === 'selected')
          ? {
              next_move: 'Start highest leverage planned outcome.',
              go_here: 'Next Up outcomes',
              write_make_do: state.outcomes.filter((o) => o.status !== 'done').sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))[0]?.first_action || 'Start the top planned outcome.',
              proof_needed: 'Log one concrete proof item.',
              timebox_minutes: 25,
              avoid: 'Do not over-plan.',
              suggested_action: 'start_focus' as const
            }
          : state.outcomes.some((o) => o.status === 'done' && !o.proof_provided)
            ? {
                next_move: 'Log proof for completed work.',
                go_here: 'Completed today section',
                write_make_do: 'Open completed outcome and attach proof.',
                proof_needed: 'Screenshot, link, or short note.',
                timebox_minutes: 5,
                avoid: 'Do not skip proof.',
                suggested_action: 'log_proof' as const
              }
            : state.outcomes.length && !state.debrief
              ? {
                  next_move: 'Close day and save debrief.',
                  go_here: 'Close day button',
                  write_make_do: 'Generate debrief and set tomorrow first move.',
                  proof_needed: 'Debrief saved with next move.',
                  timebox_minutes: 5,
                  avoid: 'Do not end day without debrief.',
                  suggested_action: 'close_day' as const
                }
              : {
                  next_move: 'Plan today now.',
                  go_here: 'Plan today modal',
                  write_make_do: 'Generate top 3 outcomes.',
                  proof_needed: 'Three outcomes with proof requirement.',
                  timebox_minutes: 10,
                  avoid: 'Do not start random tasks.',
                  suggested_action: 'none' as const
                };
    const sanitizedAi: DailyAIResponse = aiInvalid
      ? {
          ...ai,
          ...fallbackMove,
          direct_answer: 'Using local next move.',
          next_action: fallbackMove.write_make_do,
          suggested_focus_minutes: fallbackMove.timebox_minutes,
          focus_minutes: fallbackMove.timebox_minutes,
          drift_warning: '',
          priority_reason: 'Local fallback selected due to low AI relevance.'
        }
      : ai;
    const assistant: DailyCoachMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: sanitizedAi?.direct_answer || 'Pick one concrete next action and begin now.',
      created_at: nowIso(),
      ai: sanitizedAi
    };
      updateState((prev) => ({ ...prev, coach_messages: [...prev.coach_messages, assistant].slice(-80) }));
    } finally {
      setIsCoachLoading(false);
    }
  }

  function debriefToMarkdown(debrief: DailyDebrief) {
    return `# Daily Debrief

Summary:
${debrief.summary}

Original Goals:
${debrief.original_goals || state.daily_goals || 'none'}

Completed:
${debrief.completed_outcomes.map((item) => `- ${item}`).join('\n') || '- none'}

Proof:
${debrief.proof_logged.map((item) => `- ${item}`).join('\n') || '- none'}

Biggest Win:
${debrief.biggest_win}

Biggest Leak:
${debrief.biggest_leak}

Lesson:
${debrief.lesson_learned}

Tomorrow's First Move:
${debrief.tomorrow_first_move}

Scores:
Execution: ${debrief.execution_score}/100
Money: ${debrief.money_score}/100
`;
  }

  function buildDebrief(useAiSummary: boolean): DailyDebrief {
    const completed = state.outcomes.filter((o) => o.status === 'done');
    const blocked = state.outcomes.filter((o) => o.status === 'blocked');
    const unfinished = state.outcomes.filter((o) => o.status !== 'done');
    const totalFocusMinutes = state.active_focus_block?.actual_minutes || state.outcomes.reduce((sum, o) => sum + (o.actual_minutes || 0), 0);
    const proofItems = (state.proof_items || []).map((item) => item.note || item.file_name || 'Proof artifact');
    const executionScore = Math.min(100, (completed.length * 30) + Math.min(25, totalFocusMinutes) + Math.min(20, proofItems.length * 10));
    const moneyScore = Math.min(100, completed.filter((o) => o.category === 'money').length * 35 + (proofItems.length ? 15 : 0));
    const biggestWin = debriefFields.biggest_win.trim() || completed[0]?.title || 'Progress captured with action and proof.';
    const biggestLeak = debriefFields.biggest_leak.trim() || blocked[0]?.blocker_note || 'No major leak logged.';
    const tomorrowFirstMove = debriefFields.tomorrow_first_move.trim() || unfinished[0]?.first_action || unfinished[0]?.title || 'Plan top 3 outcomes before noon.';
    const lesson = blocked.length ? `Remove blocker early: ${blocked[0].blocker_note || blocked[0].title}` : 'Short focused blocks with proof compound results.';
    const summary = useAiSummary
      ? `You moved ${completed.length} outcomes forward, logged ${proofItems.length} proof items, and banked ${state.xp_today || 0} XP. Next start: ${tomorrowFirstMove}.`
      : `Closed day with ${completed.length}/${state.outcomes.length} outcomes complete and ${totalFocusMinutes} focus minutes.`;
    return {
      id: crypto.randomUUID(),
      date: state.date,
      original_goals: state.daily_goals || customDirection || '',
      summary,
      completed_outcomes: completed.map((o) => o.title),
      unfinished_outcomes: unfinished.map((o) => o.title),
      proof_logged: proofItems,
      focus_minutes: totalFocusMinutes,
      xp_earned: state.xp_today || 0,
      biggest_win: biggestWin,
      biggest_leak: biggestLeak,
      lesson_learned: lesson,
      tomorrow_first_move: tomorrowFirstMove,
      carry_forward: debriefFields.carry_forward.split(',').map((item) => item.trim()).filter(Boolean),
      execution_score: executionScore,
      money_score: moneyScore,
      created_at: nowIso()
    };
  }

  function saveDebrief(debrief: DailyDebrief) {
    const completed = state.outcomes.filter((o) => o.status === 'done');
    const blocked = state.outcomes.filter((o) => o.status === 'blocked');
    const skipped = state.outcomes.filter((o) => o.status === 'skipped');
    const unfinished = state.outcomes.filter((o) => o.status !== 'done');
    const report: DailyReport = {
      id: debrief.id,
      date: state.date,
      completed_outcomes: completed,
      blocked_outcomes: blocked,
      skipped_outcomes: skipped,
      total_focus_minutes: debrief.focus_minutes,
      summary: debrief.summary,
      wins: [debrief.biggest_win, ...completed.map((o) => o.title)].filter(Boolean),
      leaks: [debrief.biggest_leak, ...blocked.map((o) => o.blocker_note || o.title)].filter(Boolean),
      tomorrow_first_action: debrief.tomorrow_first_move || (unfinished[0] ? `Start with: ${unfinished[0].title}` : 'Plan top 3 outcomes.'),
      money_score: Math.round(debrief.money_score / 10),
      execution_score: Math.round(debrief.execution_score / 10),
      created_at: debrief.created_at
    };
    updateState((prev) => ({ ...prev, status: 'complete', report, debrief }));
    try {
      const raw = localStorage.getItem(getReportsStorageKey());
      const list = raw ? JSON.parse(raw) : [];
      localStorage.setItem(getReportsStorageKey(), JSON.stringify([{
        id: debrief.id,
        type: 'daily_debrief',
        report,
        debrief,
        markdown: debriefToMarkdown(debrief),
        created_at: debrief.created_at
      }, ...(Array.isArray(list) ? list : [])].slice(0, 200)));
    } catch {
      // ignore local report indexing failure
    }
    logEvent('report_generated', 'Day closed');
    void trackProductEvent('daily_report_generated', '/daily', { report_id: debrief.id, execution_score: debrief.execution_score });
    void trackEvent('day_closed', { report_id: debrief.id, execution_score: debrief.execution_score });
    void trackEvent('report_generated', { report_id: debrief.id, execution_score: debrief.execution_score });
    addRecentActivity({ type: 'daily_report_generated', title: 'Day closed with debrief', route: '/daily' });
  }

  function handleCloseDay(mode: 'ai' | 'manual' = 'ai') {
    if (state.status === 'complete' && state.debrief) {
      setMobileTab('report');
      pushToast('Debrief already saved. Use Regenerate if needed.');
      return;
    }
    const hasProgress = state.outcomes.some((o) => o.status === 'done') || (state.proof_items?.length || 0) > 0;
    if (!hasProgress && !showCloseWarning) {
      setShowCloseWarning(true);
      return;
    }
    const debrief = buildDebrief(mode === 'ai');
    saveDebrief(debrief);
    if (!state.closed_xp_awarded) {
      let closeXp = 30;
      if ((state.proof_items?.length || 0) > 0) closeXp += 10;
      if (state.outcomes.length > 0 && state.outcomes.every((o) => o.status === 'done')) closeXp += 25;
      const hasCloseProgress = state.outcomes.some((o) => o.status === 'done') || (state.proof_items?.length || 0) > 0;
      if (hasCloseProgress) {
        setProgression((prev) => {
          const streak = prev.last_active_date === today ? prev.current_streak : prev.current_streak + 1;
          return {
            ...prev,
            reports_generated_total: prev.reports_generated_total + 1,
            current_streak: streak,
            best_streak: Math.max(prev.best_streak, streak),
            last_active_date: today
          };
        });
        pushToast('Streak protected');
      }
      awardXP(closeXp, 'Day closed', 'big');
      updateState((prev) => ({ ...prev, closed_xp_awarded: true }));
    }
    setRewardData({
      title: 'Day closed.',
      xp: 30,
      copy: 'Your progress is saved. Tomorrow has a first move.',
      next: debrief.tomorrow_first_move
    });
    setShowReward(true);
    setShowCloseDayModal(false);
    setShowCloseWarning(false);
    setMobileTab('report');
  }

  function generateReport() {
    setShowCloseDayModal(true);
  }

  function carryForward() {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextKey = getDailyStorageKey(nextDay.toISOString().slice(0, 10));
    const carry = state.outcomes.filter((o) => o.status !== 'done').map((o, idx) => ({
      ...o,
      id: crypto.randomUUID(),
      status: 'planned' as const,
      source_type: 'carried_forward' as const,
      completed_at: null,
      priority: Math.min(3, idx + 1) as 1 | 2 | 3,
      updated_at: nowIso()
    }));
    const existingRaw = localStorage.getItem(nextKey);
    const existing = existingRaw ? JSON.parse(existingRaw) : buildInitialState(nextDay.toISOString().slice(0, 10));
    localStorage.setItem(nextKey, JSON.stringify({
      ...existing,
      outcomes: carry,
      custom_context: state.debrief?.tomorrow_first_move || existing.custom_context || '',
      next_day_seed: {
        carry_forward: state.debrief?.carry_forward || [],
        tomorrow_first_move: state.debrief?.tomorrow_first_move || ''
      }
    }));
    localStorage.setItem('taskpilot-next-day-seed', JSON.stringify({
      date: nextDay.toISOString().slice(0, 10),
      carry_forward: state.debrief?.carry_forward || carry.map((item) => item.title),
      tomorrow_first_move: state.debrief?.tomorrow_first_move || ''
    }));
    logEvent('carry_over', `Carried ${carry.length} outcomes to tomorrow.`);
    awardXP(10, 'Carry forward', 'small');
    pushToast('Tomorrow\'s first move saved.');
  }

  const activeFocus = state.active_focus_block;
  const sortedOutcomes = sortDailyOutcomes(state.outcomes, state.active_outcome_id);
  const activeOutcomeRows = sortedOutcomes.filter((o) => o.status === 'active' || o.id === state.active_outcome_id);
  const nextUpRows = sortedOutcomes.filter((o) => o.status === 'planned' || o.status === 'selected');
  const blockedRows = sortedOutcomes.filter((o) => o.status === 'blocked');
  const completedRows = sortedOutcomes.filter((o) => o.status === 'done');
  const completedCollapsedByDefault = (activeOutcomeRows.length + nextUpRows.length + blockedRows.length) > 0;
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
  const localRecommendation = useMemo(() => {
    const activeMission =
      state.outcomes.find((o) => o.id === state.active_focus_block?.outcome_id) ||
      state.outcomes.find((o) => o.status === 'active');
    if (state.active_focus_block?.status === 'active') {
      return {
        move: activeMission?.title || 'Finish current mission.',
        where: 'Current Mission card',
        do: state.active_focus_block.current_action || activeMission?.first_action || 'Complete one action now.',
        proof: activeMission?.proof_required || 'Screenshot or note',
        timebox: 10,
        avoid: 'Do not context switch.'
      };
    }
    if (activeMission) {
      return {
        move: activeMission.title,
        where: 'Current Mission card',
        do: activeMission.first_action || activeMission.title,
        proof: activeMission.proof_required || 'One proof item',
        timebox: Math.min(30, Math.max(10, Math.round((activeMission.estimated_minutes || 30) / 2))),
        avoid: activeMission.risk || 'Avoid context switching.'
      };
    }
    const planned = [...state.outcomes].filter((o) => o.status === 'planned' || o.status === 'selected').sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))[0];
    if (planned) {
      const h = state.plan_next_move_hint;
      return {
        move: h?.move || planned.title,
        where: h?.where || 'Next Up section',
        do: planned.first_action || h?.do || planned.title,
        proof: planned.proof_required || 'One proof item',
        timebox: h?.timebox || 25,
        avoid: h?.avoid || planned.risk || 'Avoid over-planning.'
      };
    }
    const missingProof = state.outcomes.find((o) => o.status === 'done' && !o.proof_provided);
    if (missingProof) {
      return {
        move: 'Log proof for completed work.',
        where: 'Completed today section',
        do: `Add proof for ${missingProof.title}`,
        proof: missingProof.proof_required || 'Screenshot or note',
        timebox: 5,
        avoid: 'Do not skip proof.'
      };
    }
    if (state.outcomes.length > 0 && !state.debrief) {
      return {
        move: 'Close day and save debrief.',
        where: 'Close day button',
        do: 'Generate debrief and set tomorrow move.',
        proof: 'Debrief saved',
        timebox: 5,
        avoid: 'Do not end day open-loop.'
      };
    }
    return {
      move: 'Plan today now.',
      where: 'Plan Builder',
      do: 'Describe your real goal and build a work-type-aware plan.',
      proof: 'Three proof-backed outcomes',
      timebox: 10,
      avoid: 'Do not start random tasks.'
    };
  }, [state, dailyGoalsInput]);
  const activeMission =
    state.outcomes.find((o) => o.id === state.active_focus_block?.outcome_id) ||
    state.outcomes.find((o) => o.status === 'active') ||
    [...state.outcomes].filter((o) => o.status === 'planned' || o.status === 'selected').sort((a, b) => (b.leverage_score || 0) - (a.leverage_score || 0))[0] ||
    null;
  const compactMissionRows = [...state.outcomes]
    .filter((o) => o.status !== 'done' && o.status !== 'skipped')
    .sort((a, b) => a.priority - b.priority)
    .map((o) => ({
      id: o.id,
      label: o.short_title || o.title,
      status: o.id === activeMission?.id ? 'Active' : o.status === 'blocked' ? 'Blocked' : o.status === 'active' ? 'Active' : 'Next',
      hasProof: Boolean(o.proof_provided?.trim())
    }));

  function buildMissionDraft(outcome: DailyOutcome | null) {
    if (!outcome) return 'No active mission. Plan today first.';
    const title = outcome.title.toLowerCase();
    if (/detail|car|route|customer|van/.test(title)) {
      return `ACTION\nOpen your calendar and create this table now.\n\nMAKE\nCustomer | Address | Service | Arrival Window | Estimated Finish | Notes\n\nPROOF\nScreenshot the completed route/timing table.\n\nNEXT\nSend the first "on my way" message template.`;
    }
    if (/sales|outreach|lead|prospect/.test(title)) {
      return `ACTION\nBuild your first 10-prospect list now.\n\nMAKE\nName | Channel | Pain Signal | Message Variant | Status\n\nPROOF\nScreenshot the sheet with 10 rows.\n\nNEXT\nSend message variant A to first 3 prospects.`;
    }
    if (/hardware|esp|arduino|atom|flash|firmware/.test(title)) {
      return `ACTION\nRun the first hardware verification step.\n\nMAKE\nChecklist: detect port -> flash test sketch -> read serial output.\n\nPROOF\nScreenshot of serial output + detected port.\n\nNEXT\nRun API heartbeat test with robot key.`;
    }
    if (/build|feature|deploy|component|bug/.test(title)) {
      return `ACTION\nOpen the target file and implement the smallest shippable diff.\n\nMAKE\nChecklist: file path -> change -> npm run build -> screenshot.\n\nPROOF\nBuild passes + screenshot of result.\n\nNEXT\nWrite 3-line release note.`;
    }
    return `ACTION\n${outcome.first_action || 'Start the first concrete action.'}\n\nMAKE\nChecklist:\n- ${outcome.checklist?.[0] || 'Do step 1'}\n- ${outcome.checklist?.[1] || 'Do step 2'}\n- ${outcome.checklist?.[2] || 'Do step 3'}\n\nPROOF\n${outcome.proof_required || 'Log one proof item.'}\n\nNEXT\nMark complete or move to the next mission.`;
  }
  const executionScore = Math.min(100, ((completedToday * 25) + Math.min(30, focusMinutesToday) + Math.min(20, (state.proof_count_today || 0) * 10)));

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
        <DailyHeader
          date={state.date}
          status={state.status}
          streak={progression.current_streak || dailyStreak}
          completedToday={completedToday}
          focusMinutesToday={focusMinutesToday}
          xpToday={state.xp_today || 0}
          totalXp={progression.total_xp}
          level={progression.level}
          aiMode={aiMode}
          syncLabel={syncLabel}
          betaAdmin={betaAdmin}
          savedAtLabel={new Date(state.last_saved_at || nowIso()).toLocaleTimeString()}
          deskBotBadgeClass={
            deskBotConfigured && deskBotMeta?.online
              ? 'border-emerald-500/40 text-emerald-200'
              : deskBotConfigured
                ? 'border-slate-600 text-slate-400'
                : 'border-slate-700 text-slate-500'
          }
          deskBotBadgeText={
            !deskBotConfigured
              ? 'DeskBot · Link key in Settings'
              : `DeskBot ${deskBotMeta?.online ? 'Online' : 'Offline'} · Last seen ${secondsAgoLabel(deskBotMeta?.last_heartbeat_at)}${
                  deskBotState?.mission ? ` · ${deskBotState.mission.length > 36 ? `${deskBotState.mission.slice(0, 36)}…` : deskBotState.mission}` : ''
                }`
          }
          deskBotUiTick={deskBotUiTick}
          onCloseDay={safeAction('Close day', () => setShowCloseDayModal(true))}
          onPlanToday={safeAction('Plan today', openPlanModal)}
          onResetDay={() => setShowResetConfirm(true)}
        />

        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
          {state.status === 'planning' && 'Plan today\'s outcomes.'}
          {state.status === 'focus' && 'You are in execution mode.'}
          {state.status === 'complete' && 'Day closed. Debrief saved.'}
          {state.status === 'blocked' && 'Blocker detected. Resolve before continuing.'}
        </div>
        <DeskBotStatusCard
          className={`mb-4 block rounded-xl border p-3 text-xs transition ${
            deskBotConfigured && deskBotMeta?.online
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
              : 'border-slate-700 bg-slate-950/40 text-slate-300'
          }`}
          headline={
            deskBotConfigured
              ? deskBotMeta?.online
                ? 'DeskBot showing current mission.'
                : `DeskBot offline. Last seen ${secondsAgoLabel(deskBotMeta?.last_heartbeat_at)}.`
              : 'DeskBot not configured. Add robot key in Settings.'
          }
          mission={deskBotState?.mission}
          nextMove={deskBotState?.next_move}
          syncStatus={deskBotSyncStatus}
          hint={deskBotState?.button_hint}
        />

        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {(['outcomes', 'focus', 'coach', 'timeline', 'report'] as DailyTab[]).map((tab) => (
            <button key={tab} className={`btn-secondary btn-sm ${mobileTab === tab ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
        <div className="mb-4 grid gap-3">
          <DailyLoopProgress currentStep={loopStep} />
          <DailyScorecard executionScore={executionScore} focusMinutes={focusMinutesToday} outcomesCompleted={completedToday} outcomesTotal={Math.max(1, state.outcomes.length)} proofLogged={state.proof_count_today || 0} streak={progression.current_streak || dailyStreak} xpToday={state.xp_today || 0} level={progression.level || 1} />
        </div>
        <DailyDebriefCard
          debrief={state.debrief}
          onCopy={() => navigator.clipboard.writeText(debriefToMarkdown(state.debrief!))}
          onViewReport={() => router.push(`/reports/${state.debrief?.id}`)}
          onPlanTomorrow={carryForward}
          onRegenerate={() => setShowCloseDayModal(true)}
        />
        {process.env.NODE_ENV !== 'production' && <details className="mb-4 card p-4">
          <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-slate-400">Daily Loop Health</summary>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <p>{state.outcomes.length > 0 ? '✓' : '○'} outcomes exist</p>
            <p>{state.events.some((e) => e.type === 'started_focus') ? '✓' : '○'} focus started</p>
            <p>{(state.proof_count_today || 0) > 0 ? '✓' : '○'} proof logged</p>
            <p>{state.outcomes.some((o) => o.status === 'done') ? '✓' : '○'} outcome completed</p>
            <p>{Boolean(state.debrief) ? '✓' : '○'} debrief generated</p>
            <p>{Boolean(state.debrief?.tomorrow_first_move) ? '✓' : '○'} tomorrow move saved</p>
          </div>
        </details>}

        <DailyGoalIntake
          dailyGoalsInput={dailyGoalsInput}
          onDailyGoalsInputChange={(v) => {
            setDailyGoalsInput(v);
            setCustomDirection(v);
          }}
          showIntake={!state.outcomes.length && state.status !== 'complete'}
          modalOpen={planBuilderModalOpen}
          onModalOpenChange={setPlanBuilderModalOpen}
          onAcceptDailyPlan={(outcomes, meta) => {
            if (state.outcomes.length) {
              setPlanReplaceBuffer({ outcomes, meta });
              setShowReplacePrompt(true);
              return;
            }
            commitDailyPlan(outcomes, meta, 'replace');
          }}
          onSavePlaybook={(workflow) => {
            saveGeneratedWorkflow(workflow);
            pushToast('Playbook saved locally.');
          }}
          onCarryForward={carryForward}
          onStartBlank={() => {
            setDailyGoalsInput('');
            setSelectedDayType('custom');
            setDayType('custom');
          }}
          onOpenPlanModal={openPlanModal}
        />

        {state.status !== 'complete' && <DailyPlanPreview>
          <div className={`${mobileTab === 'outcomes' ? 'block' : 'hidden'} lg:block`}>
            <TodayMissionQueue>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Today&apos;s Outcomes</h2>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={safeAction('Plan today', openPlanModal)}>Plan today</button>
                  <button className="btn-ghost btn-sm" onClick={safeAction('Add outcome', () => addOutcome())}>Add outcome</button>
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
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Mission Queue</h3>
                    <div className="space-y-1">
                      {compactMissionRows.map((row, idx) => (
                        <div key={row.id} className={`flex items-center justify-between rounded-lg border px-2 py-2 text-sm ${row.status === 'Active' ? 'border-amber-400 bg-amber-400/10' : row.status === 'Blocked' ? 'border-amber-600/60 bg-amber-500/10' : 'border-slate-700 bg-slate-950/40'}`}>
                          <p className="truncate pr-2 text-slate-200">{idx + 1}. {row.label}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{row.status}{row.hasProof ? ' · Proof' : ''}</span>
                            {row.status !== 'Active' && <button className="btn-ghost btn-sm" onClick={() => startFocus(row.id)}>Start</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!!blockedRows.length && (
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Blocked</h3>
                      <div className="space-y-2">
                        {blockedRows.map((outcome) => (
                          <div key={outcome.id} className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3">
                            <p className="font-semibold text-white">{outcome.title}</p>
                            <p className="text-xs text-amber-200">{outcome.blocker_note || 'Missing blocker detail.'}</p>
                            <div className="mt-2 flex gap-2">
                              <button className="btn-secondary btn-sm" onClick={() => openEditOutcome(outcome.id)}>Update</button>
                              <button className="btn-ghost btn-sm" onClick={() => startFocus(outcome.id)}>Retry focus</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!completedRows.length && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300">Completed today</h3>
                        <button className="btn-ghost btn-sm" onClick={() => setShowCompletedExpanded((v) => !v)}>
                          {(showCompletedExpanded || !completedCollapsedByDefault) ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Completed today: {completedRows.length} · XP earned: +{state.xp_today || 0} · Proof: {state.proof_count_today || 0}
                      </p>
                      {(showCompletedExpanded || !completedCollapsedByDefault) ? (
                        <div className="mt-2 space-y-2">
                          {completedRows.map((outcome) => (
                            <div key={outcome.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
                              <p className="text-sm font-semibold text-white">{outcome.title}</p>
                              <p className="text-xs text-emerald-200">Completed {outcome.completed_at ? new Date(outcome.completed_at).toLocaleTimeString() : ''}</p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <button className="btn-ghost btn-sm" onClick={() => openProofModal(outcome.id)}>View proof</button>
                                <button className="btn-ghost btn-sm" onClick={() => openWorkflowDraft(outcome.id)}>Create Playbook</button>
                                <button className="btn-ghost btn-sm" onClick={() => openLessonModal(outcome.id)}>Save lesson</button>
                                {queuedPlaybookByOutcome[outcome.id] && <span className="badge">Already created from this outcome</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {completedRows.map((outcome) => (
                            <div key={outcome.id} className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1">
                              <p className="truncate pr-2 text-xs text-slate-200">{outcome.title}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{outcome.completed_at ? new Date(outcome.completed_at).toLocaleTimeString() : ''}</span>
                                <span>Proof {outcome.proof_provided ? 1 : 0}</span>
                                <button className="btn-ghost btn-sm" onClick={() => openProofModal(outcome.id)}>View</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TodayMissionQueue>
          </div>

          <div className={`${mobileTab === 'focus' ? 'block' : 'hidden'} lg:block`}>
            <CurrentMissionPanel>
              {!activeMission ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">No mission selected</p>
                  <p className="mt-1 text-sm text-slate-400">Plan today to create a mission queue.</p>
                  <button className="btn-primary btn-sm mt-3" onClick={safeAction('Plan today', openPlanModal)}>Plan Today</button>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-300">
                  <p className="text-lg font-bold text-white">{activeMission.title}</p>
                  <p><span className="text-slate-500">Objective:</span> {activeMission.objective || activeMission.why_it_matters}</p>
                  <p><span className="text-slate-500">First action:</span> {(activeFocus?.current_action || activeMission.first_action || '').split('.').slice(0, 1).join('.').slice(0, 180)}</p>
                  <p><span className="text-slate-500">Proof:</span> {(activeMission.proof_required || 'Visible progress note').slice(0, 120)}</p>
                  {!!activeMission.done_when && (
                    <p><span className="text-slate-500">Done when:</span> {activeMission.done_when}</p>
                  )}
                  {!!activeMission.checklist?.length && (
                    <ul className="list-inside list-disc text-xs text-slate-300">
                      {activeMission.checklist?.slice(0, 3).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  )}
                  <p><span className="text-slate-500">Timer:</span> {activeFocus?.actual_minutes || 0}m / {activeFocus?.planned_minutes || activeMission.estimated_minutes || 25}m</p>
                  <p><span className="text-slate-500">Status:</span> {activeFocus?.status === 'active' ? 'Focused' : activeMission.status}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-primary btn-sm" onClick={safeAction('Log proof', () => openProofModal(activeMission.id))}>Log Proof</button>
                    <button className="btn-secondary btn-sm" onClick={safeAction('Complete', () => completeOutcome(activeMission.id))}>Complete</button>
                    <button className="btn-secondary btn-sm" onClick={safeAction('Blocked', () => openBlockedModal(activeMission.id))}>Blocked</button>
                    <button className="btn-ghost btn-sm" onClick={safeAction('Pause', () => { updateState((prev) => ({ ...prev, active_focus_block: prev.active_focus_block ? { ...prev.active_focus_block, status: 'paused' } : null })); logEvent('completed_action', 'Focus paused.'); })}>Pause</button>
                    <button className="btn-ghost btn-sm" onClick={safeAction('Create playbook', () => openWorkflowDraft(activeMission.id))}>Create Playbook</button>
                  </div>
                </div>
              )}
            </CurrentMissionPanel>
          </div>

          <div className={`${mobileTab === 'coach' ? 'block' : 'hidden'} lg:block`}>
            <NextMovePanel>
              <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">Copilot</h2>
              <p className="mb-2 text-xs text-slate-500">Helps you finish the current mission.</p>
              <div className="mb-2 flex flex-wrap gap-2">
                <button className={`btn-secondary btn-sm ${copilotMode === 'action' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setCopilotMode('action')}>Action</button>
                <button className={`btn-secondary btn-sm ${copilotMode === 'draft' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setCopilotMode('draft')}>Draft</button>
                <button className={`btn-secondary btn-sm ${copilotMode === 'blocked' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setCopilotMode('blocked')}>Blocked</button>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                <button className="btn-primary btn-sm" onClick={() => {
                  setCopilotMode('action');
                  setCopilotArtifact(`ACTION\n${localRecommendation.do}\n\nPROOF\n${localRecommendation.proof}\n\nNEXT\n${localRecommendation.move}`);
                }}>Give me the next action</button>
                <button className="btn-secondary btn-sm" onClick={() => {
                  setCopilotMode('draft');
                  setCopilotArtifact(buildMissionDraft(activeMission));
                }}>Draft it for me</button>
                <button className="btn-secondary btn-sm" onClick={() => {
                  setCopilotMode('blocked');
                  setCopilotArtifact(`ACTION\nName the blocker in one line.\n\nMAKE\nBlocked because: ____\nTime lost: ____\nSuggested fix: ____\nSmaller next action: ____\n\nPROOF\nScreenshot after unblocked step.\n\nNEXT\nRun the smaller next action for 10 minutes.`);
                  if (activeMission) openBlockedModal(activeMission.id);
                }}>I&apos;m blocked</button>
              </div>
              <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200 whitespace-pre-wrap">
                {copilotArtifact || `ACTION\n${localRecommendation.do}\n\nMAKE\n${buildMissionDraft(activeMission).split('\n\nMAKE\n')[1]?.split('\n\nPROOF')[0] || 'Use mission checklist template.'}\n\nPROOF\n${localRecommendation.proof}\n\nNEXT\n${localRecommendation.move}`}
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <button className="btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(copilotArtifact || buildMissionDraft(activeMission))}>Copy draft</button>
                <button className="btn-secondary btn-sm" onClick={safeAction('Log proof', () => openProofModal(activeMission?.id || state.active_outcome_id))}>Log proof</button>
                <button className="btn-secondary btn-sm" onClick={safeAction('Mark complete', () => activeMission && completeOutcome(activeMission.id))}>Mark complete</button>
              </div>
              <button className="btn-ghost btn-sm mb-2 self-start" onClick={() => setShowCoachHistory((prev) => !prev)}>{showCoachHistory ? 'Hide history' : 'Show history'}</button>
              {showCoachHistory && (
                <div className="min-h-0 max-h-[320px] flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-[15px] leading-7">
                  {state.coach_messages.map((m) => (
                    <div key={m.id} className={`rounded-xl p-3 ${m.role === 'assistant' ? 'bg-slate-800/80 text-slate-100' : 'bg-amber-400/10 text-amber-100'}`}>
                      <p className="text-xs uppercase tracking-widest text-slate-400">{m.role}</p>
                      <p>{m.content}</p>
                    </div>
                  ))}
                  {!state.coach_messages.length && <p className="text-sm text-slate-400">No coach messages yet. Ask what to do first.</p>}
                </div>
              )}
              {!showCoachHistory && (
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-400">
                  Copilot stays focused on current mission. Open history only when needed.
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask if blocked or unclear..." onKeyDown={(e) => e.key === 'Enter' && void sendCoachMessage()} />
                <button className="btn-primary" onClick={safeAction('Send coach message', () => void sendCoachMessage())}>Send</button>
              </div>
            </NextMovePanel>
            
          </div>
        </DailyPlanPreview>}

        {state.events.length > 0 && (
          <div className={`${mobileTab === 'timeline' ? 'block' : 'hidden'} mt-5 lg:block`}>
            <DailyTimeline
              open={mobileTab === 'timeline' && state.status === 'complete'}
              shownEvents={shownEvents}
              hasMore={state.events.length > 10}
              showAllEvents={showAllEvents}
              onToggleAll={() => setShowAllEvents((prev) => !prev)}
            />
          </div>
        )}

        <div className={`${mobileTab === 'report' ? 'block' : 'hidden'} mt-5 lg:block`}>
          <details className="card p-5" open={state.status === 'complete'}>
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-slate-400">Report</summary>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Report</h2>
            {state.debrief ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">Debrief saved for today.</p>
                <p className="mt-1 text-sm text-slate-400">Open full report for details, proof history, and carry-forward actions.</p>
                <div className="mt-2 flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => router.push(`/reports/${state.debrief?.id}`)}>Open report</button>
                  <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(debriefToMarkdown(state.debrief!))}>Copy debrief</button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="font-semibold text-white">No report yet</p>
                <p className="mt-1 text-sm text-slate-400">Close your day with wins, leaks, carry-forward outcomes, and next action.</p>
                <button className="btn-primary btn-sm mt-3" onClick={safeAction('Close the day', () => setShowCloseDayModal(true))}>Close the day</button>
              </div>
            )}
          </details>
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <details className="mt-5 card p-4">
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-slate-400">Button Audit (Dev)</summary>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              {TODAY_BUTTON_AUDIT.map((item) => (
                <p key={`${item.location}-${item.label}`}>
                  {item.label} · {item.location} · handler {item.handler_exists ? 'yes' : 'no'} · {item.status}
                </p>
              ))}
            </div>
          </details>
        )}

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
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!planReplaceBuffer) return;
                    commitDailyPlan(planReplaceBuffer.outcomes, planReplaceBuffer.meta, 'replace');
                  }}
                >
                  Replace outcomes
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    if (!planReplaceBuffer) return;
                    commitDailyPlan(planReplaceBuffer.outcomes, planReplaceBuffer.meta, 'append');
                  }}
                >
                  Append outcomes
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setShowReplacePrompt(false);
                    setPlanReplaceBuffer(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowResetConfirm(false)}>
            <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Reset day</h2>
              <p className="mt-1 text-sm text-slate-400">Reset today&apos;s plan? This clears today&apos;s outcomes and focus blocks, but keeps your lifetime XP, level, reports, and evidence vault.</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary" onClick={() => {
                  try {
                    const raw = localStorage.getItem(getReportsStorageKey());
                    const list = raw ? JSON.parse(raw) : [];
                    localStorage.setItem(getReportsStorageKey(), JSON.stringify([{ id: crypto.randomUUID(), type: 'daily_archive', report: state, created_at: nowIso() }, ...(Array.isArray(list) ? list : [])].slice(0, 200)));
                  } catch {
                    // ignore archive failure
                  }
                  setState(buildInitialState(today));
                  setShowResetConfirm(false);
                  pushToast('Archived today and reset.');
                }}>Archive today and reset</button>
                <button className="btn-danger" onClick={() => { setState(buildInitialState(today)); setShowResetConfirm(false); pushToast('Reset without archive.'); }}>Reset without archive</button>
                <button className="btn-ghost" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {showCloseDayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => { setShowCloseDayModal(false); setShowCloseWarning(false); }}>
            <div className="card w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Close the day</h2>
              <p className="mt-1 text-sm text-slate-400">Review what moved forward, capture lessons, and set tomorrow&apos;s first move.</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                <p>Outcomes completed: {state.outcomes.filter((o) => o.status === 'done').length} / {state.outcomes.length}</p>
                <p>Focus minutes: {focusMinutesToday}</p>
                <p>Proof logged: {state.proof_items?.length || 0}</p>
                <p>XP earned today: +{state.xp_today || 0}</p>
                <p>Current streak: {progression.current_streak}</p>
                <p>Active unfinished outcomes: {state.outcomes.filter((o) => o.status !== 'done').length}</p>
                <p className="md:col-span-2">Blockers: {state.outcomes.filter((o) => o.status === 'blocked').map((o) => o.blocker_note || o.title).join(', ') || 'none'}</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className="input" placeholder="Biggest win today" value={debriefFields.biggest_win} onChange={(e) => setDebriefFields((prev) => ({ ...prev, biggest_win: e.target.value }))} />
                <input className="input" placeholder="Biggest leak / distraction" value={debriefFields.biggest_leak} onChange={(e) => setDebriefFields((prev) => ({ ...prev, biggest_leak: e.target.value }))} />
                <input className="input" placeholder="What should carry forward?" value={debriefFields.carry_forward} onChange={(e) => setDebriefFields((prev) => ({ ...prev, carry_forward: e.target.value }))} />
                <input className="input" placeholder="Tomorrow's first move" value={debriefFields.tomorrow_first_move} onChange={(e) => setDebriefFields((prev) => ({ ...prev, tomorrow_first_move: e.target.value }))} />
              </div>
              {showCloseWarning && (
                <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <p>You have not logged proof or completed an outcome yet. Close anyway?</p>
                  <div className="mt-2 flex gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => { setShowCloseDayModal(false); openProofModal(state.active_outcome_id); }}>Log proof first</button>
                    <button className="btn-danger btn-sm" onClick={() => handleCloseDay('manual')}>Close anyway</button>
                    <button className="btn-ghost btn-sm" onClick={() => setShowCloseWarning(false)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary" onClick={() => handleCloseDay('ai')}>Generate debrief</button>
                <button className="btn-secondary" onClick={() => handleCloseDay('manual')}>Close without AI</button>
                <button className="btn-ghost" onClick={() => { setShowCloseDayModal(false); setShowCloseWarning(false); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {workflowDraftSourceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setWorkflowDraftSourceId(null)}>
            <div className="card w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Create playbook from outcome</h2>
              <p className="mt-1 text-sm text-slate-400">Use this when the outcome is repeatable. Choose step count and style, then preview before saving.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className="input" value={workflowDraft.workflow_name} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, workflow_name: e.target.value }))} placeholder="Playbook name" />
                <input className="input" value={workflowDraft.goal} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, goal: e.target.value }))} placeholder="Goal" />
                <input className="input" value={workflowDraft.desired_result} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, desired_result: e.target.value }))} placeholder="Desired result" />
                <input className="input" value={workflowDraft.proof_required} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, proof_required: e.target.value }))} placeholder="Proof required" />
                <select className="input" value={workflowDraft.step_count} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, step_count: Number(e.target.value) as 5 | 7 | 10 }))}>
                  <option value={5}>5 steps</option>
                  <option value={7}>7 steps</option>
                  <option value={10}>10 steps</option>
                </select>
                <select className="input" value={workflowDraft.style} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, style: e.target.value as 'fast checklist' | 'guided mode' | 'proof mode' | 'SOP mode' }))}>
                  <option value="fast checklist">fast checklist</option>
                  <option value="guided mode">guided mode</option>
                  <option value="proof mode">proof mode</option>
                  <option value="SOP mode">SOP mode</option>
                </select>
              </div>
              <textarea className="input mt-2 min-h-20" value={workflowDraft.context} onChange={(e) => setWorkflowDraft((prev) => ({ ...prev, context: e.target.value }))} placeholder="Context for generation" />
              {!workflowDraft.generated ? (
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary" onClick={() => void convertOutcomeToWorkflow(workflowDraftSourceId)}>Generate preview</button>
                  <button className="btn-ghost" onClick={() => setWorkflowDraftSourceId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                    <p className="font-semibold text-white">{workflowDraft.generated.workflow_name}</p>
                    <p className="text-xs text-slate-400">{workflowDraft.generated.steps.length} steps · {workflowDraft.generated.category}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => finalizeWorkflowFromDraft('start')}>Start playbook</button>
                    <button className="btn-secondary" onClick={() => finalizeWorkflowFromDraft('save')}>Save playbook</button>
                    <button className="btn-secondary" onClick={() => finalizeWorkflowFromDraft('edit')}>Edit playbook</button>
                    <button className="btn-ghost" onClick={() => setWorkflowDraftSourceId(null)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <ProofModal
          open={Boolean(proofTargetOutcomeId)}
          outcomeId={proofTargetOutcomeId || ''}
          outcomeTitle={state.outcomes.find((o) => o.id === proofTargetOutcomeId)?.title || 'Active outcome'}
          onSave={saveProofItem}
          onClose={() => setProofTargetOutcomeId(null)}
        />
        <RewardMoment
          open={showReward}
          title={rewardData.title}
          xp={rewardData.xp}
          copy={rewardData.copy}
          next={rewardData.next}
          primaryLabel={rewardData.title === 'Day closed.' ? 'View debrief' : 'Continue mission'}
          secondaryLabel={rewardData.title === 'Day closed.' ? 'Plan tomorrow' : undefined}
          onPrimary={() => { setShowReward(false); setMobileTab('report'); }}
          onSecondary={() => { setShowReward(false); carryForward(); }}
          onClose={() => setShowReward(false)}
        />
        {showCompleteWithoutProof && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowCompleteWithoutProof(null)}>
            <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Complete without proof?</h2>
              <p className="mt-1 text-sm text-slate-400">This outcome has no proof yet.</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary" onClick={() => { openProofModal(showCompleteWithoutProof); setShowCompleteWithoutProof(null); }}>Log proof first</button>
                <button className="btn-primary" onClick={() => { const id = showCompleteWithoutProof; setShowCompleteWithoutProof(null); if (id) { updateState((prev) => ({ ...prev, outcomes: prev.outcomes.map((o) => o.id === id ? { ...o, status: 'done', completed_at: nowIso(), updated_at: nowIso() } : o) })); setProgression((prev) => ({ ...prev, completed_outcomes_total: prev.completed_outcomes_total + 1 })); awardXP(25, 'Outcome complete', 'big'); } }}>Complete anyway</button>
                <button className="btn-ghost" onClick={() => setShowCompleteWithoutProof(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        
        
        {playbookLimitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setPlaybookLimitModalOpen(false)}>
            <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">You&apos;ve hit today&apos;s playbook generation limit.</h2>
              <p className="mt-2 text-sm text-slate-300">Daily planning is still available. Playbook generation is limited during beta to control AI usage.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary btn-sm" onClick={() => { setPlaybookLimitModalOpen(false); setMobileTab('outcomes'); }}>Continue in Today</button>
                <button className="btn-secondary btn-sm" onClick={() => { setPlaybookLimitModalOpen(false); router.push('/workflows/generate'); }}>Use manual playbook builder</button>
                <button className="btn-secondary btn-sm" onClick={() => { setPlaybookLimitModalOpen(false); router.push('/pricing'); }}>Join Pro waitlist</button>
                <button className="btn-ghost btn-sm" onClick={() => setPlaybookLimitModalOpen(false)}>Dismiss</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
