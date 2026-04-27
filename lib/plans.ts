export type Plan = 'free' | 'pro' | 'team';

export type PlanLimits = {
  playbook_generation: number | 'unlimited';
  daily_plan_generation: number | 'unlimited';
  copilot_messages: number | 'unlimited';
  active_sessions: number | 'unlimited';
  proof_uploads: boolean;
  daily_mode: boolean;
  robot_api: boolean;
  workflow_exports: boolean;
};

const LIMITS: Record<Plan, PlanLimits> = {
  free: {
    playbook_generation: 3,
    daily_plan_generation: 'unlimited',
    copilot_messages: 40,
    active_sessions: 5,
    proof_uploads: false,
    daily_mode: false,
    robot_api: false,
    workflow_exports: false
  },
  pro: {
    playbook_generation: 'unlimited',
    daily_plan_generation: 'unlimited',
    copilot_messages: 'unlimited',
    active_sessions: 'unlimited',
    proof_uploads: true,
    daily_mode: true,
    robot_api: true,
    workflow_exports: true
  },
  team: {
    playbook_generation: 'unlimited',
    daily_plan_generation: 'unlimited',
    copilot_messages: 'unlimited',
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

export function canUseFeature(userPlan: Plan, feature: keyof Omit<PlanLimits, 'playbook_generation' | 'daily_plan_generation' | 'copilot_messages' | 'active_sessions'>) {
  return Boolean(getPlanLimits(userPlan)[feature]);
}
