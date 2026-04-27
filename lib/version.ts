export const TASKPILOT_VERSION = '0.2.0-beta';
export const TASKPILOT_APP_NAME = 'TaskPilot';
export const TASKPILOT_TAGLINE = 'GPS for getting things done.';

export function getTaskPilotVersionInfo() {
  return {
    app: TASKPILOT_APP_NAME,
    version: TASKPILOT_VERSION,
    tagline: TASKPILOT_TAGLINE,
    updated_at: '2026-04-26'
  };
}
