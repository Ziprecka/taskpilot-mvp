export const TASKPILOT_VERSION = '0.3.0-beta';
export const TASKPILOT_APP_NAME = 'TaskPilot';
export const TASKPILOT_TAGLINE = 'Finish the day with proof.';

export function getTaskPilotVersionInfo() {
  return {
    app: TASKPILOT_APP_NAME,
    version: TASKPILOT_VERSION,
    tagline: TASKPILOT_TAGLINE,
    updated_at: '2026-04-26'
  };
}
