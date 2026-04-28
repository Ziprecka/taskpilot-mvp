/** localStorage keys for browser → robot API sync (user pastes server key once). */
export const ROBOT_API_KEY_LS = 'taskpilot-robot-api-key';
export const ROBOT_ID_LS = 'taskpilot-robot-id';
export const DEFAULT_ROBOT_ID = 'atom-s3r-001';

export function getSavedRobotId(): string {
  if (typeof window === 'undefined') return DEFAULT_ROBOT_ID;
  return localStorage.getItem(ROBOT_ID_LS) || DEFAULT_ROBOT_ID;
}

export function getSavedRobotApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROBOT_API_KEY_LS);
}

export function secondsAgoLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
