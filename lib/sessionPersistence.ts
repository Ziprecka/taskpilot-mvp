import { getSessionStorageKey } from '@/lib/storage';
import type { ChatMessage, TaskPilotSessionState } from '@/types/workflow';

export function loadSessionState<T>(sessionId: string): T | null {
  try {
    const raw = localStorage.getItem(getSessionStorageKey(sessionId));
    if (process.env.NODE_ENV !== 'production') console.log('[TaskPilot][persist] session loaded from: localStorage');
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveSessionState<T>(sessionId: string, state: T) {
  localStorage.setItem(getSessionStorageKey(sessionId), JSON.stringify(state));
  if (process.env.NODE_ENV !== 'production') console.log('[TaskPilot][persist] session saved to localStorage');
}

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function syncSessionToSupabase(sessionId: string, state: any) {
  const payload = { ...state } as any;
  if (sessionId && !sessionId.startsWith('local-session-')) payload.id = sessionId;
  const res = await postJson('/api/db/session', payload);
  if (process.env.NODE_ENV !== 'production') console.log('[TaskPilot][persist] session synced to Supabase', res.ok);
  return res;
}

export async function loadSessionFromSupabase(sessionId?: string, workflowSlug?: string) {
  const query = sessionId
    ? `id=${encodeURIComponent(sessionId)}`
    : `workflow_slug=${encodeURIComponent(workflowSlug || '')}`;
  const payload = await fetch(`/api/db/session?${query}`).then((res) => res.json());
  if (process.env.NODE_ENV !== 'production') console.log('[TaskPilot][persist] session loaded from: supabase');
  return payload;
}

export async function loadMessagesFromSupabase(sessionId: string) {
  return fetch(`/api/db/messages?session_id=${encodeURIComponent(sessionId)}`).then((res) => res.json());
}

export function toCanonicalSessionState(input: TaskPilotSessionState): TaskPilotSessionState {
  return {
    ...input,
    messages: input.messages.slice(-50),
    notes: input.notes.slice(0, 20),
    uploads: input.uploads.slice(0, 5),
    updated_at: new Date().toISOString()
  };
}

export function fromDbSessionToCanonical(
  dbSession: any,
  defaults: Partial<TaskPilotSessionState> = {}
): TaskPilotSessionState {
  const now = new Date().toISOString();
  return {
    session_id: String(dbSession?.id ?? defaults.session_id ?? `local-${Date.now()}`),
    workflow_slug: String(dbSession?.workflow_slug ?? defaults.workflow_slug ?? 'taskpilot-mvp-build'),
    workflow_name: String(defaults.workflow_name ?? 'TaskPilot MVP Build Workflow'),
    goal: String(dbSession?.goal ?? defaults.goal ?? 'Complete workflow'),
    mode: String(dbSession?.mode ?? defaults.mode ?? 'guide'),
    status: (dbSession?.status ?? defaults.status ?? 'active') as TaskPilotSessionState['status'],
    current_step: Number(dbSession?.current_step ?? defaults.current_step ?? 1),
    completed_steps: Array.isArray(dbSession?.completed_steps) ? dbSession.completed_steps : (defaults.completed_steps ?? []),
    ai_next_action: String(dbSession?.ai_next_action ?? defaults.ai_next_action ?? ''),
    detected_issues: Array.isArray(dbSession?.detected_issues) ? dbSession.detected_issues : (defaults.detected_issues ?? []),
    confidence: (dbSession?.confidence ?? defaults.confidence ?? 'medium') as TaskPilotSessionState['confidence'],
    notes: defaults.notes ?? [],
    uploads: defaults.uploads ?? [],
    messages: (defaults.messages ?? []) as ChatMessage[],
    report: defaults.report ?? null,
    ai_source: (dbSession?.ai_source ?? defaults.ai_source ?? 'mock') as TaskPilotSessionState['ai_source'],
    sync_status: (defaults.sync_status ?? 'local') as TaskPilotSessionState['sync_status'],
    created_at: String(dbSession?.started_at ?? defaults.created_at ?? now),
    updated_at: String(dbSession?.updated_at ?? defaults.updated_at ?? now),
    completed_at: dbSession?.completed_at ?? defaults.completed_at ?? null
  };
}

export async function saveMessage(sessionId: string, message: any) {
  return postJson('/api/db/messages', { session_id: sessionId, ...message });
}

export async function saveNote(sessionId: string, note: any) {
  return postJson('/api/db/notes', { session_id: sessionId, ...note });
}

export async function saveUpload(sessionId: string, upload: any) {
  return postJson('/api/db/uploads', { session_id: sessionId, ...upload });
}

export async function saveReport(sessionId: string, report: any) {
  return postJson('/api/db/reports', { session_id: sessionId, ...report });
}
