export function validateRobotRequest(request: Request): {
  ok: boolean;
  error?: string;
} {
  const configuredKey = process.env.TASKPILOT_ROBOT_API_KEY;
  if (!configuredKey) {
    return { ok: false, error: 'Robot API key not configured.' };
  }
  const headerKey = request.headers.get('x-taskpilot-robot-key');
  if (!headerKey) {
    return { ok: false, error: 'Missing robot API key.' };
  }
  if (headerKey !== configuredKey) {
    return { ok: false, error: 'Invalid robot API key.' };
  }
  return { ok: true };
}
