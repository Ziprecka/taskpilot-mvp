export type RobotStatus =
  | 'idle'
  | 'focused'
  | 'waiting_for_proof'
  | 'drift_detected'
  | 'blocked'
  | 'complete'
  | 'offline'
  | 'debugging';

export type RobotCommandType =
  | 'speak'
  | 'gesture'
  | 'show_status'
  | 'show_mission'
  | 'show_next'
  | 'show_proof'
  | 'capture_proof'
  | 'blocked'
  | 'request_proof'
  | 'blocked_prompt'
  | 'daily_briefing'
  | 'start_focus'
  | 'stop_focus'
  | 'check_in';

export type RobotRegistration = {
  robot_id: string;
  name: string;
  device_type: 'raspberry_pi' | 'xgo' | 'petoi' | 'm5stack' | 'custom';
  capabilities: {
    speaker: boolean;
    microphone: boolean;
    camera: boolean;
    screen: boolean;
    movement: boolean;
    leds: boolean;
  };
  last_seen_at: string;
};

export type RobotState = {
  robot_id: string;
  status: RobotStatus;
  active_session_id: string | null;
  active_daily_focus_id: string | null;
  current_task: string;
  current_step: string;
  next_action: string;
  proof_needed: string;
  drift_risk: 'low' | 'medium' | 'high';
  last_progress_minutes_ago: number;
  ai_message: string;
  updated_at: string;
};

export type RobotDisplayState = {
  robot_id: string;
  status: 'idle' | 'focused' | 'waiting_for_proof' | 'blocked' | 'complete' | 'offline';
  mode: 'status' | 'mission' | 'next' | 'proof';
  mission: string;
  next_move: string;
  proof_needed: string;
  short_message: string;
  last_seen_at: string | null;
  button_hint: string;
};

export type RobotCommand = {
  id: string;
  robot_id: string;
  type: RobotCommandType;
  message: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
  created_at: string;
};

export type RobotEvent = {
  id: string;
  robot_id: string;
  event_type:
    | 'boot'
    | 'heartbeat'
    | 'button_pressed'
    | 'long_press'
    | 'double_press'
    | 'voice_command'
    | 'photo_captured'
    | 'checkin_due'
    | 'proof_uploaded'
    | 'blocked'
    | 'proof_request'
    | 'error';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
