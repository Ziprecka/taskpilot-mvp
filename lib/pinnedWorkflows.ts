const KEY = 'taskpilot-pinned-workflows';

export function getPinnedWorkflowIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function togglePinnedWorkflow(id: string): string[] {
  const current = getPinnedWorkflowIds();
  const exists = current.includes(id);
  const next = exists ? current.filter((item) => item !== id) : [id, ...current].slice(0, 20);
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
