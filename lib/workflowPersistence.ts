import type { Workflow } from '@/types/workflow';
import { getGeneratedWorkflowsStorageKey } from '@/lib/storage';

export function loadGeneratedWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(getGeneratedWorkflowsStorageKey());
    return raw ? (JSON.parse(raw) as Workflow[]) : [];
  } catch {
    return [];
  }
}

export function saveGeneratedWorkflow(workflow: Workflow): Workflow[] {
  const existing = loadGeneratedWorkflows();
  const filtered = existing.filter((item) => item.id !== workflow.id);
  const next = [{ ...workflow }, ...filtered];
  localStorage.setItem(getGeneratedWorkflowsStorageKey(), JSON.stringify(next));
  return next;
}

export function deleteGeneratedWorkflow(id: string): Workflow[] {
  const existing = loadGeneratedWorkflows();
  const next = existing.filter((item) => item.id !== id);
  localStorage.setItem(getGeneratedWorkflowsStorageKey(), JSON.stringify(next));
  return next;
}
