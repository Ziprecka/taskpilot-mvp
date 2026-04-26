const MAX_UPLOADS = 5;
const MAX_NOTES = 20;
const MAX_MESSAGES = 50;

export function sessionStorageKey(sessionId: string): string {
  return `taskpilot-session-${sessionId}`;
}

export function getSessionStorageKey(sessionIdOrSlug: string): string {
  return `taskpilot-session-${sessionIdOrSlug}`;
}

export function getDailyStorageKey(dateIso: string): string {
  return `taskpilot-daily-${dateIso}`;
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
