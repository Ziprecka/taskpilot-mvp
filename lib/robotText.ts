const MARKDOWN_RE = /[*_`>#~\[\]\(\)!]/g;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/open google calendar and write tomorrow'?s? \d+ customer appointments?/i, 'List appointments'],
  [/open google calendar/i, 'Open calendar'],
  [/screenshot or photo of loaded van and route\/timing plan/i, 'Photo van + route'],
  [/screenshot or photo/i, 'Photo or screenshot'],
  [/continue current mission/i, 'Run active mission'],
  [/continue workflow step/i, 'Run workflow step'],
  [/continue workflow/i, 'Run workflow'],
  [/start a 5-minute first move/i, 'Start first task'],
  [/write messy goals/i, 'Plan today'],
  [/plan today in taskpilot/i, 'Create daily plan'],
  [/no mission yet/i, 'Plan today']
];

function cleanRobotText(text: string): string {
  let next = (text || '').replace(/\r?\n+/g, ' ').replace(MARKDOWN_RE, ' ').replace(EMOJI_RE, ' ');
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  next = next.replace(/\s+/g, ' ').trim();
  return next;
}

export function truncateRobotText(text: string, maxChars: number): string {
  const cleaned = cleanRobotText(text);
  const fallback = 'Do next step';
  if (!cleaned) return fallback.slice(0, maxChars);
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, Math.max(1, maxChars - 1)).trim()}…`;
}

export function normalizeRobotMission(text: string): string {
  const normalized = truncateRobotText(text, 24);
  return normalized || 'Today mission';
}

export function normalizeRobotNextMove(text: string): string {
  const normalized = truncateRobotText(text, 36);
  return normalized || 'Create daily plan';
}

export function normalizeRobotProof(text: string): string {
  const normalized = truncateRobotText(text, 36);
  return normalized || 'Start first mission';
}

export function normalizeRobotShortMessage(text: string): string {
  const normalized = truncateRobotText(text, 60);
  return normalized || 'Stay on mission';
}
