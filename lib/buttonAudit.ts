export type ButtonAuditItem = {
  label: string;
  location: string;
  handler_exists: boolean;
  expected_behavior: string;
  status: 'working' | 'placeholder' | 'remove';
};

export const TODAY_BUTTON_AUDIT: ButtonAuditItem[] = [
  { label: 'Plan today', location: 'Header + Outcomes', handler_exists: true, expected_behavior: 'Open Plan Builder modal', status: 'working' },
  { label: 'Close day', location: 'Header', handler_exists: true, expected_behavior: 'Open close-day debrief flow', status: 'working' },
  { label: 'Reset day', location: 'Header', handler_exists: true, expected_behavior: 'Open reset confirmation', status: 'working' },
  { label: 'Focus/Start', location: 'Current Mission + Next Up', handler_exists: true, expected_behavior: 'Start selected mission focus block', status: 'working' },
  { label: 'Log proof', location: 'Current Mission + Focus + Next Move', handler_exists: true, expected_behavior: 'Open proof modal for mission', status: 'working' },
  { label: 'Complete', location: 'Current Mission + Focus', handler_exists: true, expected_behavior: 'Mark mission complete', status: 'working' },
  { label: 'Blocked', location: 'Current Mission + Focus', handler_exists: true, expected_behavior: 'Open blocked modal and capture blocker note', status: 'working' },
  { label: 'Edit', location: 'Next Up', handler_exists: true, expected_behavior: 'Open mission editor', status: 'working' },
  { label: 'Create playbook', location: 'Next Up/Completed/Focus', handler_exists: true, expected_behavior: 'Open playbook draft from mission', status: 'working' },
  { label: 'Save lesson', location: 'Completed', handler_exists: true, expected_behavior: 'Capture lesson from finished mission', status: 'working' },
  { label: 'Improve this page', location: 'Outcomes header', handler_exists: true, expected_behavior: 'Internal prototype action', status: 'remove' },
  { label: 'Do this', location: 'Next Move', handler_exists: true, expected_behavior: 'Duplicate of focus/start action', status: 'remove' },
  { label: 'Make smaller', location: 'Next Move', handler_exists: true, expected_behavior: 'Chat-only nudge, weak impact', status: 'remove' }
];
