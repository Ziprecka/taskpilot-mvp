import { sampleWorkflows } from '@/data/sampleWorkflows';
import type { WorkflowSession } from '@/types/workflow';

export const defaultSession: WorkflowSession = {
  id: 'demo-session',
  workflow_id: 'arduino-led-blink',
  goal: 'Build an Arduino LED Blink circuit and verify it works.',
  mode: 'guide',
  current_step: 1,
  completed_steps: [],
  detected_issues: [],
  confidence: 'medium',
  status: 'active',
  started_at: new Date().toISOString(),
  uploads: [],
  notes: []
};

export const activeWorkflow = sampleWorkflows[0];
