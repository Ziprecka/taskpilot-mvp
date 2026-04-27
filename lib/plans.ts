export type Plan = 'free' | 'pro' | 'team';

export type PlanLimits = {
  generated_workflows_per_month: number | 'unlimited';
  active_sessions: number | 'unlimited';
  proof_uploads: boolean;
  daily_mode: boolean;
  robot_api: boolean;
  workflow_exports: boolean;
};

const LIMITS: Record<Plan, PlanLimits> = {
  free: {
    generated_workflows_per_month: 3,
    active_sessions: 5,
    proof_uploads: false,
    daily_mode: false,
    robot_api: false,
    workflow_exports: false
  },
  pro: {
    generated_workflows_per_month: 'unlimited',
    active_sessions: 'unlimited',
    proof_uploads: true,
    daily_mode: true,
    robot_api: true,
    workflow_exports: true
  },
  team: {
    generated_workflows_per_month: 'unlimited',
    active_sessions: 'unlimited',
    proof_uploads: true,
    daily_mode: true,
    robot_api: true,
    workflow_exports: true
  }
};

export function getPlanLimits(plan: Plan) {
  return LIMITS[plan] || LIMITS.free;
}

export function canUseFeature(userPlan: Plan, feature: keyof Omit<PlanLimits, 'generated_workflows_per_month' | 'active_sessions'>) {
  return Boolean(getPlanLimits(userPlan)[feature]);
}
