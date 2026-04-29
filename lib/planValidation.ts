import type { PlanBuilderOutput } from '@/types/planBuilder';

const BANNED_GENERIC_TITLES = [
  'clarify target and path',
  'execute one concrete outcome',
  'execute and verify',
  'create core assets',
  'rewrite your goal',
  'make progress',
  'start a 5-minute first move'
];

export function validatePlanAgainstGoal(rawGoal: string, plan: PlanBuilderOutput) {
  const issues: string[] = [];
  const goalTerms = rawGoal.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const missionText = (plan.daily_outcomes || [])
    .map((m) => `${m.title} ${m.objective || ''} ${m.first_action || ''} ${m.proof_required || ''}`)
    .join(' ')
    .toLowerCase();

  const goalHits = goalTerms.filter((t) => missionText.includes(t)).length;
  if (goalHits < 2) issues.push('Goal nouns missing from missions.');

  const deliverables = plan.extracted_goal_facts?.deliverables || [];
  const deliverableHits = deliverables.filter((d) => missionText.includes(d.toLowerCase().split(' ')[0] || '')).length;
  if (deliverables.length && deliverableHits < Math.min(2, deliverables.length)) issues.push('Deliverables not reflected in missions.');

  const prohibited = plan.assumptions.filter((a) => a.toLowerCase().startsWith('prohibited:')).map((a) => a.replace(/^prohibited:/i, '').trim().toLowerCase());
  if (prohibited.some((p) => p && missionText.includes(p))) issues.push('Prohibited item appears in mission text.');

  if (/suds auto salon|seattle detailing|sam\b/.test(missionText)) issues.push('Private context leak detected.');
  if ((plan.daily_outcomes || []).some((m) => BANNED_GENERIC_TITLES.includes(m.title.trim().toLowerCase()))) issues.push('Banned generic mission title used.');
  if ((plan.daily_outcomes || []).some((m) => !m.first_action || !m.proof_required || !m.done_when)) issues.push('Mission missing required execution fields.');

  const timeCap = /(\d+)\s*minutes?/.exec(rawGoal.toLowerCase());
  if (timeCap) {
    const cap = Number(timeCap[1]);
    const total = (plan.daily_outcomes || []).reduce((sum, m) => sum + (m.estimated_minutes || 0), 0);
    if (cap > 0 && total > cap + 20) issues.push('Plan exceeds time constraint.');
  }

  const relevanceScore = Math.max(0, goalHits * 2 + deliverableHits * 2 - issues.length * 3);
  return { ok: issues.length === 0, issues, relevanceScore };
}

