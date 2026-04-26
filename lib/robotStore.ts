import type { RobotCommand, RobotEvent, RobotRegistration, RobotState } from '@/types/robot';

const robots = new Map<string, RobotRegistration>();
const states = new Map<string, RobotState>();
const events: RobotEvent[] = [];
const commands: RobotCommand[] = [];
let lastHeartbeatAt: string | null = null;

export function registerRobot(data: Omit<RobotRegistration, 'last_seen_at'>): RobotRegistration {
  const robot: RobotRegistration = {
    ...data,
    last_seen_at: new Date().toISOString()
  };
  robots.set(robot.robot_id, robot);
  if (!states.has(robot.robot_id)) {
    states.set(robot.robot_id, {
      robot_id: robot.robot_id,
      status: 'idle',
      active_session_id: 'taskpilot-mvp-build',
      active_daily_focus_id: null,
      current_task: 'TaskPilot MVP Build Workflow',
      current_step: 'Add robot API routes',
      next_action: 'Create authenticated robot API routes.',
      proof_needed: 'Successful API test response.',
      drift_risk: 'low',
      last_progress_minutes_ago: 0,
      ai_message:
        'Current task is Add robot API routes. Next action: implement register, state, event, command, and heartbeat endpoints.',
      updated_at: new Date().toISOString()
    });
  }
  return robot;
}

export function getRobot(robotId: string) {
  return robots.get(robotId) ?? null;
}

export function getRobotState(robotId: string): RobotState | null {
  return states.get(robotId) ?? null;
}

export function updateRobotState(robotId: string, patch: Partial<RobotState>): RobotState {
  const existing = states.get(robotId) ?? {
    robot_id: robotId,
    status: 'idle' as const,
    active_session_id: null,
    active_daily_focus_id: null,
    current_task: '',
    current_step: '',
    next_action: '',
    proof_needed: '',
    drift_risk: 'low' as const,
    last_progress_minutes_ago: 0,
    ai_message: '',
    updated_at: new Date().toISOString()
  };
  const next: RobotState = { ...existing, ...patch, updated_at: new Date().toISOString() };
  states.set(robotId, next);
  return next;
}

export function addRobotEvent(event: Omit<RobotEvent, 'id' | 'created_at'>): RobotEvent {
  const saved: RobotEvent = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...event
  };
  events.unshift(saved);
  return saved;
}

export function addRobotCommand(command: Omit<RobotCommand, 'id' | 'created_at' | 'status'>): RobotCommand {
  const saved: RobotCommand = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: 'pending',
    ...command
  };
  commands.unshift(saved);
  return saved;
}

export function getPendingRobotCommand(robotId: string): RobotCommand | null {
  return commands.find((command) => command.robot_id === robotId && command.status === 'pending') ?? null;
}

export function acknowledgeRobotCommand(commandId: string, status: RobotCommand['status']) {
  const command = commands.find((item) => item.id === commandId);
  if (!command) return null;
  command.status = status;
  return command;
}

export function markHeartbeat() {
  lastHeartbeatAt = new Date().toISOString();
}

export function getRobotStoreHealth() {
  return {
    routes_exist: true,
    test_page_exists: true,
    heartbeat_successful: Boolean(lastHeartbeatAt),
    last_heartbeat_at: lastHeartbeatAt
  };
}
