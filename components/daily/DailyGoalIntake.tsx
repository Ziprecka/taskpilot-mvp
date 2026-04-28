'use client';

import { PlanBuilder } from '@/components/PlanBuilder';
import type { DailyOutcome } from '@/types/workflow';
import type { PlanBuilderOutput } from '@/types/planBuilder';

type AcceptMeta = { daily_goals: string; detected_work_type: string; plan: PlanBuilderOutput };

type Props = {
  dailyGoalsInput: string;
  onDailyGoalsInputChange: (v: string) => void;
  showIntake: boolean;
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  onAcceptDailyPlan: (outcomes: DailyOutcome[], meta: AcceptMeta) => void;
  onSavePlaybook: (workflow: any) => void;
  onCarryForward: () => void;
  onStartBlank: () => void;
  onOpenPlanModal: () => void;
};

export function DailyGoalIntake(props: Props) {
  return (
    <div className="mb-5 space-y-3">
      <PlanBuilder
        defaultMode="daily_execution"
        goalText={props.dailyGoalsInput}
        onGoalTextChange={props.onDailyGoalsInputChange}
        showIntake={props.showIntake}
        modalOpen={props.modalOpen}
        onModalOpenChange={props.onModalOpenChange}
        onAcceptDailyPlan={props.onAcceptDailyPlan}
        onSavePlaybook={props.onSavePlaybook}
      />
      {props.showIntake && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" type="button" onClick={props.onCarryForward}>Use yesterday&apos;s carry-forward</button>
          <button className="btn-ghost btn-sm" type="button" onClick={props.onStartBlank}>Start from blank</button>
          <button className="btn-ghost btn-sm" type="button" onClick={props.onOpenPlanModal}>Plan Today (modal)</button>
        </div>
      )}
    </div>
  );
}
