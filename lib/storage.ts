const MAX_UPLOADS = 5;
const MAX_NOTES = 20;
const MAX_MESSAGES = 50;

function resolveStorageUserId() {
  if (typeof window === 'undefined') return 'demo-user';
  return localStorage.getItem('taskpilot-auth-user-id') || 'demo-user';
}

export function getStorageUserKey(userId?: string | null) {
  return userId || resolveStorageUserId();
}

export function sessionStorageKey(sessionId: string): string {
  return `taskpilot-session-${getStorageUserKey()}-${sessionId}`;
}

export function getSessionStorageKey(sessionIdOrSlug: string): string {
  return `taskpilot-session-${getStorageUserKey()}-${sessionIdOrSlug}`;
}

export function getDailyStorageKey(dateIso: string): string {
  return `taskpilot-daily-${getStorageUserKey()}-${dateIso}`;
}

export function getGeneratedWorkflowsStorageKey() {
  return `taskpilot-generated-workflows-${getStorageUserKey()}`;
}

export function getFeedbackStorageKey() {
  return `taskpilot-feedback-${getStorageUserKey()}`;
}

export function getReportsStorageKey() {
  return `taskpilot-reports-${getStorageUserKey()}`;
}

export function getProofStorageKey() {
  return `taskpilot-proof-log-${getStorageUserKey()}`;
}

export function getProInterestStorageKey() {
  return `taskpilot-pro-interest-${getStorageUserKey()}`;
}

export function getUserProgressionStorageKey() {
  return `taskpilot-user-progression-${getStorageUserKey()}`;
}

export function getWorkflowLibraryMetaStorageKey() {
  return `taskpilot-workflow-library-meta-${getStorageUserKey()}`;
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
