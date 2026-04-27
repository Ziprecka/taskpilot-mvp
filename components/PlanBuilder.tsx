'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Workflow } from '@/types/workflow';
import type { DetectedWorkType, PlanBuilderOutput, PlanTimeHorizon } from '@/types/planBuilder';
import { buildPlan, detectWorkType, workTypeLabel } from '@/lib/planBuilder';
import type { DailyOutcome } from '@/types/workflow';

const WORK_TYPES: DetectedWorkType[] = [
  'service_business_day',
  'sales_outreach_day',
  'app_build_day',
  'hardware_setup_day',
  'research_day',
  'admin_cleanup_day',
  'learning_day',
  'personal_day',
  'generic_productivity'
];

const TIME_OPTIONS: { id: PlanTimeHorizon; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this_week', label: 'This week' },
  { id: 'repeatable', label: 'Repeatable' }
];

type AcceptMeta = { daily_goals: string; detected_work_type: string; plan: PlanBuilderOutput };

type Props = {
  defaultMode: 'daily_execution' | 'playbook';
  goalText?: string;
  onGoalTextChange?: (v: string) => void;
  initialGoal?: string;
  showIntake?: boolean;
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  onAcceptDailyPlan?: (outcomes: DailyOutcome[], meta: AcceptMeta) => void;
  onSavePlaybook?: (workflow: Workflow, plan: PlanBuilderOutput) => void;
};

export function PlanBuilder({
  defaultMode,
  goalText: controlledGoal,
  onGoalTextChange,
  initialGoal,
  showIntake = true,
  modalOpen,
  onModalOpenChange,
  onAcceptDailyPlan,
  onSavePlaybook
}: Props) {
  const [internalGoal, setInternalGoal] = useState(initialGoal || '');
  const goal = controlledGoal !== undefined ? controlledGoal : internalGoal;
  const setGoal = (v: string) => {
    onGoalTextChange?.(v);
    if (controlledGoal === undefined) setInternalGoal(v);
  };

  useEffect(() => {
    if (initialGoal && controlledGoal === undefined) setInternalGoal(initialGoal);
  }, [initialGoal, controlledGoal]);

  const [timeHorizon, setTimeHorizon] = useState<PlanTimeHorizon>('today');
  const [workOverride, setWorkOverride] = useState<DetectedWorkType | ''>('');
  const [preview, setPreview] = useState<PlanBuilderOutput | null>(null);

  useEffect(() => {
    if (!modalOpen) setPreview(null);
  }, [modalOpen]);

  const autoDetected = useMemo(() => detectWorkType(goal), [goal]);

  function runBuild(opts?: { clearWorkTypeOverride?: boolean }) {
    const override = opts?.clearWorkTypeOverride ? null : workOverride || null;
    if (opts?.clearWorkTypeOverride) setWorkOverride('');
    const plan = buildPlan({
      raw_goal: goal,
      mode: defaultMode,
      category: 'productivity',
      time_horizon: timeHorizon,
      detected_work_type_override: override
    });
    setPreview(plan);
    if (opts?.clearWorkTypeOverride) setWorkOverride(plan.detected_work_type);
    else setWorkOverride((prev) => prev || plan.detected_work_type);
    onModalOpenChange(true);
  }

  function handleSavePlaybookClick() {
    if (!preview) return;
    const wt = ((workOverride || preview.detected_work_type) as DetectedWorkType) || 'generic_productivity';
    const pb = buildPlan({
      raw_goal: goal,
      mode: 'playbook',
      category: 'productivity',
      time_horizon: timeHorizon,
      detected_work_type_override: wt
    });
    if (pb.playbook && onSavePlaybook) onSavePlaybook(pb.playbook, pb);
    onModalOpenChange(false);
  }

  function handleAcceptToday() {
    if (!preview?.daily_outcomes?.length || !onAcceptDailyPlan) return;
    const oc = preview.daily_outcomes.map((o, idx) => ({
      ...o,
      priority: Math.min(3, idx + 1) as 1 | 2 | 3
    }));
    onAcceptDailyPlan(oc, {
      daily_goals: goal,
      detected_work_type: preview.detected_work_type,
      plan: preview
    });
    onModalOpenChange(false);
  }

  const headline =
    defaultMode === 'daily_execution'
      ? 'What are your goals for today?'
      : 'What repeatable process do you want to turn into a playbook?';
  const sub =
    defaultMode === 'daily_execution'
      ? 'Write messy goals. TaskPilot will turn them into outcomes, focus blocks, and proof.'
      : 'Describe the real-world loop once. TaskPilot structures steps, proof, and reuse.';

  const EXAMPLES_SERVICE =
    'Run a successful 3 car mobile detailing day tomorrow with before/after proof and customer messages.';
  const EXAMPLES_HW =
    'Set up Atom S3R and connect it to TaskPilot app. Also test lotto bitcoin miner.';
  const EXAMPLES_SALES = 'Get beta users for TaskPilot.';
  const EXAMPLES_BUILD = 'Ship one UX fix on the Daily page with deploy proof.';

  const IntakeFields = (
    <div className="space-y-3">
      <textarea
        className="input min-h-28"
        placeholder="Example: complete 3 details, send beta outreach, fix one app issue, prep tomorrow’s route…"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <span className="text-xs uppercase tracking-widest text-slate-500">Examples</span>
        <button type="button" className="btn-ghost btn-sm text-left" onClick={() => setGoal(EXAMPLES_SERVICE)}>
          Service day
        </button>
        <button type="button" className="btn-ghost btn-sm text-left" onClick={() => setGoal(EXAMPLES_HW)}>
          Hardware + side quest
        </button>
        <button type="button" className="btn-ghost btn-sm text-left" onClick={() => setGoal(EXAMPLES_SALES)}>
          Beta outreach
        </button>
        <button type="button" className="btn-ghost btn-sm text-left" onClick={() => setGoal(EXAMPLES_BUILD)}>
          Ship UX fix
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-500">Time horizon</label>
        <select className="input max-w-[160px]" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value as PlanTimeHorizon)}>
          {TIME_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {!showIntake && goal.trim().length > 0 && (
        <p className="text-xs text-slate-500">
          Auto-detect: <span className="text-amber-200/90">{workTypeLabel(autoDetected)}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary btn-sm" onClick={() => runBuild()}>
          Build plan
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => runBuild({ clearWorkTypeOverride: true })}>
          Re-detect work type &amp; rebuild
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Plan Builder runs locally first — structured plans even when AI limits apply. Same engine as Create Playbook.
      </p>
    </div>
  );

  const PreviewBody = preview ? (
    <>
      <h2 className="text-xl font-black">{preview.plan_title}</h2>
      <p className="mt-1 text-sm text-slate-400">{preview.plan_summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="badge">Detected: {workTypeLabel(preview.detected_work_type)}</span>
        <select
          className="input max-w-xs text-sm"
          value={workOverride || preview.detected_work_type}
          onChange={(e) => setWorkOverride(e.target.value as DetectedWorkType)}
        >
          {WORK_TYPES.map((wt) => (
            <option key={wt} value={wt}>
              {workTypeLabel(wt)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => {
            const wt = (workOverride || preview.detected_work_type) as DetectedWorkType;
            const plan = buildPlan({
              raw_goal: goal,
              mode: defaultMode,
              category: 'productivity',
              time_horizon: timeHorizon,
              detected_work_type_override: wt
            });
            setPreview(plan);
          }}
        >
          Apply type
        </button>
      </div>

      {preview.assumptions?.length ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Assumptions</p>
          <ul className="list-inside list-disc">
            {preview.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Outcomes</h3>
        <div className="mt-2 space-y-2">
          {preview.daily_outcomes?.map((o) => (
            <div key={o.id} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm">
              <p className="font-semibold text-white">{o.title}</p>
              <p className="text-xs text-slate-500">First move: {o.first_action}</p>
              <p className="text-xs text-slate-500">Proof: {o.proof_required}</p>
              <p className="text-xs text-slate-600">
                Est {o.estimated_minutes}m · Leverage {o.leverage_score} · Money {o.money_potential || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {preview.schedule_blocks?.length ? (
        <details className="mt-4 open">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Timeline</summary>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {preview.schedule_blocks.map((b) => (
              <li key={b.id}>
                {b.label}
                {b.duration_minutes ? ` (~${b.duration_minutes}m)` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {preview.proof_checklist?.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Proof checklist</summary>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-300">
            {preview.proof_checklist.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {preview.message_templates?.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Message templates</summary>
          <div className="mt-2 space-y-2">
            {preview.message_templates.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-xs">
                <p className="font-semibold text-amber-200">{m.label}</p>
                <p className="text-slate-300">{m.body}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {preview.prospect_columns?.length ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Prospect tracker columns</p>
          <p>{preview.prospect_columns.join(' · ')}</p>
        </div>
      ) : null}

      {preview.success_metrics?.length ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Success metrics</p>
          <ul className="list-inside list-disc text-slate-300">
            {preview.success_metrics.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.tools_needed?.length ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Tools needed</p>
          <p>{preview.tools_needed.join(', ')}</p>
        </div>
      ) : null}

      {preview.debug_checklist?.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Debug checklist</summary>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-300">
            {preview.debug_checklist.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {preview.likely_artifacts?.length ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Likely files / artifacts</p>
          <p>{preview.likely_artifacts.join(' · ')}</p>
        </div>
      ) : null}

      {preview.risk_plan?.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Risks</summary>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {preview.risk_plan.map((r, i) => (
              <li key={i}>
                <span className="text-amber-200">{r.risk}</span> — {r.mitigation}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700 pt-4">
        {defaultMode === 'daily_execution' && onAcceptDailyPlan && (
          <button type="button" className="btn-primary btn-sm" onClick={handleAcceptToday}>
            Accept as Today Plan
          </button>
        )}
        {defaultMode === 'playbook' && preview.playbook && onSavePlaybook && (
          <button type="button" className="btn-primary btn-sm" onClick={() => preview.playbook && onSavePlaybook(preview.playbook!, preview)}>
            Save as Playbook
          </button>
        )}
        {defaultMode === 'daily_execution' && onSavePlaybook && (
          <button type="button" className="btn-secondary btn-sm" onClick={handleSavePlaybookClick}>
            Save as Playbook
          </button>
        )}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => {
            setPreview(null);
          }}
        >
          Edit
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => runBuild()}>
          Regenerate
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onModalOpenChange(false)}>
          Cancel
        </button>
      </div>
    </>
  ) : null;

  return (
    <>
      {showIntake && (
        <div className="card p-5">
          <h2 className="text-2xl font-black">{headline}</h2>
          <p className="mt-1 text-sm text-slate-400">{sub}</p>
          {IntakeFields}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => onModalOpenChange(false)}>
          <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            {!preview ? (
              <>
                <h2 className="text-xl font-black">{headline}</h2>
                <p className="mt-1 text-sm text-slate-400">{sub}</p>
                {IntakeFields}
              </>
            ) : (
              PreviewBody
            )}
          </div>
        </div>
      )}
    </>
  );
}
