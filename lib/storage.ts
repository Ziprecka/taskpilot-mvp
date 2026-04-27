const MAX_UPLOADS = 5;
const MAX_NOTES = 20;
const MAX_MESSAGES = 50;

function resolveStorageUserId() {
  if (typeof window === 'undefined') return 'demo-user';
  return localStorage.getItem('taskpilot-auth-user-id') || 'demo-user';
}

export function sessionStorageKey(sessionId: string): string {
  return `taskpilot-session-${resolveStorageUserId()}-${sessionId}`;
}

export function getSessionStorageKey(sessionIdOrSlug: string): string {
  return `taskpilot-session-${resolveStorageUserId()}-${sessionIdOrSlug}`;
}

export function getDailyStorageKey(dateIso: string): string {
  return `taskpilot-daily-${resolveStorageUserId()}-${dateIso}`;
}

export function getGeneratedWorkflowsStorageKey() {
  return `taskpilot-generated-workflows-${resolveStorageUserId()}`;
}

export function getFeedbackStorageKey() {
  return `taskpilot-feedback-${resolveStorageUserId()}`;
}

export function clampUploads<T>(uploads: T[]): T[] {
  return uploads.slice(0, MAX_UPLOADS);
}

export function clampNotes<T>(notes: T[]): T[] {
  return notes.slice(0, MAX_NOTES);
}

export function clampMessages<T>(messages: T[]): T[] {
  return messages.slice(-MAX_MESSAGES);
}
