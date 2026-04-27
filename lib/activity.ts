export interface TaskPilotActivity {
  id: string;
  type: string;
  title: string;
  route?: string;
  created_at: string;
}

const KEY = 'taskpilot-recent-activity';

export function getRecentActivity(): TaskPilotActivity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentActivity(activity: Omit<TaskPilotActivity, 'id' | 'created_at'>) {
  if (typeof window === 'undefined') return;
  const next: TaskPilotActivity = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...activity
  };
  const current = getRecentActivity();
  localStorage.setItem(KEY, JSON.stringify([next, ...current].slice(0, 40)));
}
