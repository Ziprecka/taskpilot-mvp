import type { DailyOutcome, Workflow, WorkflowCategory, WorkflowStep } from '@/types/workflow';
import type {
  DailyNextMoveResponse,
  DetectedWorkType,
  MessageTemplate,
  PlanBuilderInput,
  PlanBuilderOutput,
  PlannerSpecificity,
  PlanTimeHorizon,
  RiskPlanItem,
  ScheduleBlock,
  TodayMission
} from '@/types/planBuilder';

const WORK_TYPE_LABELS: Record<DetectedWorkType, string> = {
  service_day: 'Service Day',
  client_work_day: 'Client Work Day',
  sales_day: 'Sales Day',
  hardware_setup: 'Hardware Setup',
  app_build: 'App Build',
  research: 'Research',
  admin: 'Admin',
  learning: 'Learning',
  personal: 'Personal',
  custom: 'Custom'
};

const BAD_GENERIC_PHRASES = [
  'start a 5-minute first move',
  'make progress',
  'work on this',
  'improve workflow',
  'continue current mission',
  'ship one scoped feature',
  'fix one visible ux issue'
];
const GENERIC_FIRST_ACTION_BAN = new RegExp(`^(${BAD_GENERIC_PHRASES.join('|')})`, 'i');

export function workTypeLabel(type: DetectedWorkType): string {
  return WORK_TYPE_LABELS[type] || WORK_TYPE_LABELS.custom;
}

export function detectWorkType(raw: string): DetectedWorkType {
  const s = raw.toLowerCase();
  if (!s.trim()) return 'custom';
  const has = (re: RegExp) => re.test(s);
  if (has(/\b(detail|detailing|mobile detailing|car detail|suds auto salon|appointment|before\/after|route day|upsell|review ask)\b/)) return 'service_day';
  if (has(/\b(client|deliverable|invoice|scope|brief|revision)\b/)) return 'client_work_day';
  if (has(/\b(beta users?|outreach|prospect|lead|dm|cold email|sales)\b/)) return 'sales_day';
  if (has(/\b(atom|s3r|arduino|esp32|flash|firmware|com port|driver|wiring|robot api)\b/)) return 'hardware_setup';
  if (has(/\b(next\.?js|react|typescript|deploy|bug|component|route|feature|vercel|app)\b/)) return 'app_build';
  if (has(/\b(research|compare|sources|evaluate)\b/)) return 'research';
  if (has(/\b(inbox|calendar|admin|cleanup|overdue|paperwork|tax)\b/)) return 'admin';
  if (has(/\b(learn|study|course|quiz|practice|notes)\b/)) return 'learning';
  if (has(/\b(home|health|family|personal)\b/)) return 'personal';
  return 'custom';
}

function nowIso() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function outcomeBase(partial: Omit<DailyOutcome, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): DailyOutcome {
  const t = nowIso();
  return {
    ...partial,
    id: id(),
    created_at: t,
    updated_at: t,
    completed_at: null
  };
}

function pickCategory(work: DetectedWorkType): DailyOutcome['category'] {
  if (work === 'sales_day' || work === 'service_day' || work === 'client_work_day') return 'money';
  if (work === 'learning') return 'learning';
  if (work === 'admin') return 'admin';
  if (work === 'personal') return 'health';
  if (work === 'hardware_setup' || work === 'app_build') return 'build';
  return 'other';
}

function leverageFor(work: DetectedWorkType, idx: number): number {
  const base =
    work === 'custom'
      ? 6
      : work === 'service_day' || work === 'sales_day'
        ? 9
        : 8;
  return Math.min(10, Math.max(4, base - idx));
}

/** Replace banned vague first actions */
export function concreteFirstAction(action: string, fallback: string): string {
  const t = action.trim();
  if (!t || GENERIC_FIRST_ACTION_BAN.test(t)) return fallback;
  return t;
}

function parseCarCount(raw: string): number {
  const m = raw.match(/(\d+)\s*-?\s*car/i) || raw.match(/(\d+)\s+vehicle/i);
  if (m) return Math.min(12, Math.max(1, parseInt(m[1], 10)));
  if (/\bthree\b|\b3\b/i.test(raw) && /\bdetail/i.test(raw)) return 3;
  return 3;
}

function classifyGoal(raw: string): DetectedWorkType {
  return detectWorkType(raw);
}

function extractEntities(raw: string): string[] {
  const words = raw
    .split(/[^a-zA-Z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3);
  return Array.from(new Set(words)).slice(0, 8);
}

function toMission(outcome: DailyOutcome): TodayMission {
  const money =
    outcome.money_potential === 'high' || outcome.money_potential === 'medium'
      ? outcome.money_potential
      : 'low';
  return {
    title: outcome.title,
    objective: outcome.objective || outcome.why_it_matters || outcome.title,
    first_action: concreteFirstAction(outcome.first_action || '', `Open task board and start ${outcome.title}.`),
    checklist: outcome.checklist || [outcome.first_action || 'Start', 'Execute', 'Log proof'],
    proof_required: outcome.proof_required || 'Log proof in TaskPilot',
    estimated_minutes: outcome.estimated_minutes || 30,
    risk: outcome.risk || 'Time overrun',
    done_when: outcome.done_when || 'Proof logged and checklist complete',
    category: outcome.category,
    leverage_score: outcome.leverage_score || 7,
    money_potential: money,
    short_title: outcome.short_title
  };
}

function scoreSpecificity(raw: string, outcomes: DailyOutcome[], work: DetectedWorkType): { score: number; label: PlannerSpecificity } {
  const text = `${raw} ${outcomes.map((o) => `${o.title} ${o.first_action} ${o.proof_required}`).join(' ')}`.toLowerCase();
  let score = 0;
  const entities = extractEntities(raw);
  if (entities.some((e) => text.includes(e.toLowerCase()))) score += 2;
  if (/\b(open|write|list|send|create|load|confirm|plug|run|flash)\b/.test(text)) score += 2;
  if (/\bphoto|screenshot|sheet|message|route|checklist|calendar|device manager|google sheets\b/.test(text)) score += 2;
  if (/\bjob|vehicle|route|timeline|block|step|order|today|tomorrow\b/.test(text)) score += 2;
  if (!BAD_GENERIC_PHRASES.some((p) => text.includes(p))) score += 2;
  if (work === 'service_day' && /\bvehicle|customer|route|van|review\b/.test(text)) score += 2;
  if (score >= 10) return { score, label: 'strong' };
  if (score >= 7) return { score, label: 'good' };
  return { score, label: 'weak' };
}

function choosePlanTemplate(work: DetectedWorkType): string {
  if (work === 'service_day') return 'service_operating_plan';
  if (work === 'sales_day') return 'sales_execution_plan';
  if (work === 'hardware_setup') return 'hardware_setup_plan';
  if (work === 'app_build') return 'build_day_plan';
  return 'generic_execution_plan';
}

function buildServicePlan(raw: string, horizon: PlanTimeHorizon): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const cars = parseCarCount(raw);
  const when = horizon === 'tomorrow' ? 'tomorrow' : 'today';
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: `Confirm schedule, route, and customer expectations for ${cars} detailing jobs.`,
      objective: 'Lock route order and timing before field execution.',
      why_it_matters: 'No written route means delays and missed commitments.',
      category: 'money',
      priority: 1,
      status: 'planned',
      estimated_minutes: 35,
      actual_minutes: 0,
      proof_required: 'Screenshot or note of route/timing sheet.',
      proof_provided: '',
      first_action:
        'Open calendar/booking app and write each customer name, address, service package, arrival target, and estimated finish.',
      checklist: [
        'Confirm number of jobs and addresses',
        'Set appointment order by drive time',
        'Note customer special requests and gate/parking instructions'
      ],
      done_when: 'Route sheet and customer expectations are written and checked.',
      risk: 'Traffic delay or wrong job order',
      short_title: `${cars}-car route plan`,
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('service_day', 0),
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: `Prep van and supplies for all ${cars} vehicles.`,
      objective: 'Prevent mid-day supply failures during job execution.',
      why_it_matters: 'Supply misses force delays and quality drops.',
      category: 'money',
      priority: 2,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: 'Photo of loaded van and supply checklist.',
      proof_provided: '',
      first_action:
        'Load towels, chemicals, vacuum, steamer, power/water backup, brushes, glass towels, tire dressing, and trash bags.',
      checklist: [
        'Chemicals and tools loaded',
        'Power/water backup checked',
        'Consumables counted for all jobs'
      ],
      done_when: 'Van loadout photo captured and checklist complete.',
      risk: 'Low supplies during Job 2/3',
      short_title: 'Van loadout ready',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('service_day', 1),
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Create job-by-job proof and communication checklist.',
      objective: 'Standardize before/after proof + completion + upsell/review flow.',
      why_it_matters: 'Proof and communication drive trust and repeat revenue.',
      category: 'money',
      priority: 3,
      status: 'planned',
      estimated_minutes: 30,
      actual_minutes: 0,
      proof_required: 'Screenshot/photo of checklist.',
      proof_provided: '',
      first_action:
        'Create a 3-row checklist: before photos, worst area, after photos, completion text, review ask, maintenance recommendation.',
      checklist: [
        'Before/after slots per vehicle',
        'Completion message and recommendation slot',
        'Review ask / follow-up slot'
      ],
      done_when: 'Checklist exists and is attached to today plan.',
      risk: 'Forgetting proof or follow-up under time pressure',
      short_title: 'Proof + message ops',
      value_score: 8,
      quality_score: 8,
      leverage_score: leverageFor('service_day', 2),
      money_potential: 'high',
      urgency: 'medium',
      effort: 'low'
    })
  ];

  const schedule_blocks: ScheduleBlock[] = [
    { id: 'sb1', label: 'Tonight prep', duration_minutes: 30 },
    { id: 'sb2', label: 'Morning loadout + weather/traffic check', duration_minutes: 20 },
    { id: 'sb3', label: 'Drive / Job 1', duration_minutes: 90 },
    { id: 'sb4', label: 'Drive / Job 1', duration_minutes: 90 },
    { id: 'sb5', label: 'Drive / Job 2', duration_minutes: 90 },
    { id: 'sb6', label: cars >= 3 ? 'Drive / Job 3' : 'Buffer', duration_minutes: 90 },
    { id: 'sb7', label: 'Van reset + day report + tomorrow seed', duration_minutes: 25 }
  ];

  const message_templates: MessageTemplate[] = [
    {
      id: 'm1',
      label: 'On my way',
      body: 'Hey [Name] — on my way, ETA [time]. Parking at [note]. Reply STOP to pause updates.'
    },
    {
      id: 'm2',
      label: 'Started on vehicle',
      body: 'Starting your detail now — before photos captured. I’ll send completion photos right after.'
    },
    {
      id: 'm3',
      label: 'Completion',
      body: 'Detail complete. After photos attached. Let me know if anything needs touch-up.'
    },
    {
      id: 'm4',
      label: 'Review request',
      body: 'If everything looks good, a quick Google review helps us massively: [link]. Thank you!'
    },
    {
      id: 'm5',
      label: 'Maintenance upsell',
      body: 'Quick note: ceramic/sealant refresh in ~90 days keeps this shine — want me to pencil you in?'
    }
  ];

  const proof_checklist = [
    'Arrival photo',
    'Exterior before',
    'Interior before',
    'Worst area close-up',
    'Completed exterior',
    'Completed interior',
    'Satisfying detail shot',
    'Completion message sent',
    'Issue/recommendation logged',
    'Review/follow-up request sent'
  ];

  const risk_plan: RiskPlanItem[] = [
    { risk: 'Traffic delay', mitigation: 'Reorder jobs and send ETA updates early.' },
    { risk: 'Vehicle worse than expected', mitigation: 'Set revised expectation and skip low-impact extras.' },
    { risk: 'Customer unavailable', mitigation: 'Call and send completion gate message before arrival.' },
    { risk: 'Low supplies', mitigation: 'Carry backup water/power and consumables checklist.' },
    { risk: 'Weather/time overrun', mitigation: 'Capture proof early and adjust non-essential detail depth.' }
  ];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Confirm appointments and route before you load the van.',
    next_move: `Confirm ${cars}-car route order.`,
    go_here: 'Calendar + route sheet',
    write_make_do:
      'List each address, service, arrival time, and expected finish in route order.',
    proof_needed: 'Screenshot or photo of completed route/timing list.',
    avoid: 'Leaving without a written sequence of jobs.',
    suggested_action: 'start_focus',
    next_action: 'Build the route and timing list now.',
    suggested_focus_minutes: 10,
    priority_reason: 'Route clarity prevents cascading delays.',
    drift_warning: ''
  };

  return {
    detected_work_type: 'service_day',
    plan_title: `Service Day Operating Plan (${cars} cars)`,
    plan_summary: `Service brief, timeline blocks, mission checklist, proof ops, customer messages, and debrief for ${when}.`,
    assumptions: [
      `You already have ${cars} bookings or intend to finish ${cars} vehicles ${when}.`,
      'Customers can receive SMS/email updates.'
    ],
    clarifying_questions: [
      'Are payments on-site or invoice after photos?',
      'Do you need water/electric hookups confirmed per stop?'
    ],
    sections: [
      {
        id: 'brief',
        title: 'Service Day Brief',
        items: [
          `${cars} jobs targeted ${when}`,
          'Prep required: route + van loadout + customer expectations',
          'Communication: arrival/on-my-way/completion/review',
          'Revenue: maintenance offers + review asks'
        ]
      },
      { id: 'timeline', title: 'Timeline', items: schedule_blocks.map((b) => b.label) },
      { id: 'missions', title: 'Missions', items: outcomes.map((o) => o.title) },
      { id: 'proof', title: 'Proof Checklist', items: proof_checklist },
      { id: 'messages', title: 'Customer Messages', items: message_templates.map((m) => m.label) },
      { id: 'risks', title: 'Risks', items: risk_plan.map((r) => `${r.risk} → ${r.mitigation}`) }
    ],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    schedule_blocks,
    proof_checklist,
    message_templates,
    risk_plan,
    next_move
  };
}
function extractHardwarePrimary(raw: string): string {
  const m = raw.match(/\b(Atom\s*S3R|ESP32|Arduino\s*\w+|Raspberry\s*Pi\s*\w*)\b/i);
  return m ? m[1] : 'device';
}
function extractSideQuest(raw: string): string | null {
  const idx = raw.toLowerCase().indexOf('also');
  if (idx < 0) return null;
  const tail = raw.slice(idx + 4).trim();
  return tail.length > 5 ? tail : null;
}

function buildHardwarePlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const device = extractHardwarePrimary(raw);
  const side = extractSideQuest(raw);

  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: `Bring ${device} online on this computer (driver, port, power).`,
      why_it_matters: 'No COM port means no flash and no API path.',
      category: 'build',
      priority: 1,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: 'Screenshot of Device Manager showing the board on the correct COM port (or documented error code).',
      proof_provided: '',
      first_action:
        'Open Device Manager (Windows) or list /dev/tty* (Mac/Linux) after plugging in USB data — note the exact port name.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('hardware_setup', 0),
      money_potential: 'medium',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: `Flash a known-good test sketch and capture serial proof.`,
      why_it_matters: 'Validates wiring and toolchain before app integration.',
      category: 'build',
      priority: 2,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'Screenshot of upload success + serial monitor output showing the heartbeat/test pattern.',
      proof_provided: '',
      first_action:
        'In Arduino IDE or PlatformIO, open the vendor blink/test example targeting your board and port — upload once.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('hardware_setup', 1),
      money_potential: 'low',
      urgency: 'high',
      effort: 'high'
    }),
    outcomeBase({
      title: 'Map device to TaskPilot Robot API contract (token + endpoint smoke test).',
      why_it_matters: 'Software path depends on reliable connectivity checks.',
      category: 'build',
      priority: 3,
      status: 'planned',
      estimated_minutes: 50,
      actual_minutes: 0,
      proof_required: 'Log excerpt or screenshot of successful authenticated ping/register against your Robot API route.',
      proof_provided: '',
      first_action:
        'Copy your Robot API base URL + key into a scratch `.env.local` and run one curl against `/api/robot/heartbeat` or your register route.',
      value_score: 8,
      quality_score: 8,
      leverage_score: leverageFor('hardware_setup', 2),
      money_potential: 'medium',
      urgency: 'medium',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Document the next hardware milestone and open blockers.',
      why_it_matters: 'Prevents revisiting the same COM/driver issue tomorrow.',
      category: 'build',
      priority: 3,
      status: 'planned',
      estimated_minutes: 20,
      actual_minutes: 0,
      proof_required: 'Short markdown note with port, firmware version, failing command (if any), next experiment.',
      proof_provided: '',
      first_action:
        'Open `hardware-notes.md` (or Notion) with sections: Ports | Firmware | Tests passed | Next step.',
      value_score: 7,
      quality_score: 7,
      leverage_score: 6,
      money_potential: 'low',
      urgency: 'low',
      effort: 'low'
    })
  ];

  if (side && /\b(bitcoin|miner|hash|lotto)/i.test(side)) {
    outcomes.push(
      outcomeBase({
        title: `[Side quest] Lotto miner experiment — timeboxed, non-primary.`,
        why_it_matters: 'Treat speculative rigs as lottery experiments, not dependable revenue.',
        category: 'other',
        priority: 3,
        status: 'planned',
        estimated_minutes: 25,
        actual_minutes: 0,
        proof_required:
          'Screenshot of miner UI showing power/status/hashrate OR note “could not reach stable hash”.',
        proof_provided: '',
        first_action:
          'Set a 20-minute timer; power the miner, capture one status screen, then stop — log expectation: lottery odds, not income.',
        value_score: 3,
        quality_score: 6,
        leverage_score: 3,
        money_potential: 'none',
        urgency: 'low',
        effort: 'medium'
      })
    );
  }

  const tools_needed = ['USB data cable', 'Board support package / drivers', 'Arduino IDE or PlatformIO', 'Serial monitor'];
  const debug_checklist = [
    'Try another USB cable/port',
    'Hold BOOT/FLASH while uploading',
    'Match board definition to exact SKU',
    'Confirm 3.3V vs 5V peripherals'
  ];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Prove the board enumerates before chasing firmware features.',
    next_move: `Confirm ${device} is detected.`,
    go_here: 'Device Manager or serial port list',
    write_make_do: 'Plug USB data, refresh ports, record COM/tty name exactly.',
    proof_needed: 'Screenshot showing port present or explicit error.',
    avoid: 'Switching tools before you confirm enumeration.',
    suggested_action: 'start_focus',
    next_action: 'Identify the COM/tty name now.',
    suggested_focus_minutes: 10,
    priority_reason: 'Enumeration gates everything else.',
    drift_warning: ''
  };

  return {
    detected_work_type: 'hardware_setup',
    plan_title: `${device} bring-up + Robot API hook`,
    plan_summary: 'Enumerate → flash test → API smoke → notes; optional miner side quest is strictly timeboxed.',
    assumptions: ['USB cable supports data', 'Developer machine can install drivers'],
    clarifying_questions: ['Which OS are you flashing from?', 'Do you already have Robot API credentials in `.env.local`?'],
    daily_outcomes: outcomes.slice(0, 6),
    today_missions: outcomes.slice(0, 6).map(toMission),
    tools_needed,
    debug_checklist,
    proof_checklist: ['COM screenshot', 'Upload success', 'Serial output', 'API ping proof'],
    risk_plan: [{ risk: 'Wrong cable or charge-only USB', mitigation: 'Swap cable and port first.' }],
    next_move
  };
}

function buildSalesPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Define ICP + offer angle for today’s outreach.',
      why_it_matters: 'Generic blasts get ignored; one wedge wins.',
      category: 'money',
      priority: 1,
      status: 'planned',
      estimated_minutes: 25,
      actual_minutes: 0,
      proof_required: 'Written ICP bullets + primary pain hypothesis saved in notes.',
      proof_provided: '',
      first_action:
        'Open a blank doc and finish: “Who loses money/time without TaskPilot?” in 3 bullets.',
      value_score: 8,
      quality_score: 8,
      leverage_score: leverageFor('sales_day', 0),
      money_potential: 'high',
      urgency: 'high',
      effort: 'low'
    }),
    outcomeBase({
      title: 'Build a 25-row prospect tracker with columns + first 10 names.',
      why_it_matters: 'Tracking turns outreach into a process.',
      category: 'money',
      priority: 2,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: 'Screenshot of sheet with columns filled + at least 10 prospects.',
      proof_provided: '',
      first_action:
        'Open Google Sheets and create columns: Name | Segment | Channel | Pain signal | Message variant | Status.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('sales_day', 1),
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Send 10 targeted messages + log proofs.',
      why_it_matters: 'Volume with proof beats planning loops.',
      category: 'money',
      priority: 3,
      status: 'planned',
      estimated_minutes: 55,
      actual_minutes: 0,
      proof_required: 'Screenshots or exported CSV proving sends + any replies captured.',
      proof_provided: '',
      first_action:
        'Draft Message A (problem-led) and Message B (social proof-led) ≤90 words — paste into tracker rows 1–2.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('sales_day', 2),
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium'
    })
  ];

  const prospect_columns = ['Name', 'Segment', 'Channel', 'Pain signal', 'Message variant', 'Sent at', 'Reply?', 'Next step'];

  const message_templates: MessageTemplate[] = [
    {
      id: 's1',
      label: 'Cold DM (problem-led)',
      body: 'Hey [Name] — saw you’re [signal]. Quick question: are you still managing execution in scattered notes? We built TaskPilot to turn messy goals into proof-backed daily outcomes — worth a 12-min look?'
    },
    {
      id: 's2',
      label: 'Follow-up',
      body: 'Bumping this — happy to share the demo flow we use internally. If timing’s bad, what week works?'
    }
  ];

  const success_metrics = ['10 sends logged', '≥2 replies or ≥1 booked call', 'Feedback snippet captured'];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Create the tracker before writing more copy.',
    next_move: 'Create prospect tracker.',
    go_here: 'Google Sheets',
    write_make_do: 'Add columns and fill the first 5 real prospects with segment + channel.',
    proof_needed: 'Screenshot of populated sheet header + 5 rows.',
    avoid: 'Writing messages without a tracking sheet.',
    suggested_action: 'start_focus',
    next_action: 'Start the sheet now.',
    suggested_focus_minutes: 15,
    priority_reason: 'Tracking unlocks repeatable outreach.',
    drift_warning: ''
  };

  return {
    detected_work_type: 'sales_day',
    plan_title: 'Beta acquisition sprint',
    plan_summary: 'ICP → tracker → 10 sends with proof → capture replies.',
    assumptions: ['You have at least one channel (email/DM) to reach prospects'],
    clarifying_questions: ['Which segment are you prioritizing first (builders vs ops vs agencies)?'],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    prospect_columns,
    message_templates,
    success_metrics,
    next_move
  };
}

function buildAppBuildPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Define the smallest shippable change tied to user-visible proof.',
      why_it_matters: 'Scopes avoid “random refactor” days.',
      category: 'build',
      priority: 1,
      status: 'planned',
      estimated_minutes: 20,
      actual_minutes: 0,
      proof_required: 'One sentence ship goal + acceptance checklist (what screenshot proves it).',
      proof_provided: '',
      first_action:
        'Search the repo for the relevant route/component name from your goal — paste file path candidates into notes.',
      value_score: 8,
      quality_score: 8,
      leverage_score: leverageFor('app_build', 0),
      money_potential: 'medium',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Implement + local test with console/build proof.',
      why_it_matters: 'Shipping requires verifiable artifact.',
      category: 'build',
      priority: 2,
      status: 'planned',
      estimated_minutes: 120,
      actual_minutes: 0,
      proof_required: 'PR link or commit hash + screenshot of UI change + test/lint passing output.',
      proof_provided: '',
      first_action:
        'Open the target file, branch `feat/<slug>`, implement change behind smallest diff — run `npm run build` once.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('app_build', 1),
      money_potential: 'medium',
      urgency: 'high',
      effort: 'high'
    }),
    outcomeBase({
      title: 'Deploy or prep deploy + release note.',
      why_it_matters: 'Users only benefit when it’s live.',
      category: 'build',
      priority: 3,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'Deployment URL or Vercel preview + 3-bullet release note.',
      proof_provided: '',
      first_action:
        'If using Vercel: push branch, open preview URL, verify change in prod-like build.',
      value_score: 8,
      quality_score: 8,
      leverage_score: leverageFor('app_build', 2),
      money_potential: 'medium',
      urgency: 'medium',
      effort: 'medium'
    })
  ];

  const likely_artifacts = ['app/daily/page.tsx', 'components/', 'npm run build', 'Vercel preview URL'];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Name the file/route first, then code.',
    next_move: 'Locate target file.',
    go_here: 'Repo search',
    write_make_do: 'Identify the exact component/route to touch from your goal — write path in notes.',
    proof_needed: 'Note with file paths + intended UI change.',
    avoid: 'Coding before you name the artifact.',
    suggested_action: 'start_focus',
    next_action: 'Run repo search for keywords from your goal.',
    suggested_focus_minutes: 12,
    priority_reason: 'File clarity prevents thrash.',
    drift_warning: ''
  };

  return {
    detected_work_type: 'app_build',
    plan_title: 'Ship one scoped product change',
    plan_summary: 'Define acceptance → implement + test → deploy/preview + release note.',
    assumptions: ['Repo builds locally'],
    clarifying_questions: ['Is this user-facing or internal-only change?'],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    likely_artifacts,
    proof_checklist: ['Lint/typecheck', 'Screenshot', 'Preview URL'],
    next_move
  };
}

function buildLearningPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Pick sources + scope for today’s learning sprint.',
      why_it_matters: 'Learning without sources becomes wandering.',
      category: 'learning',
      priority: 1,
      status: 'planned',
      estimated_minutes: 25,
      actual_minutes: 0,
      proof_required: 'Links/docs listed + 5-bullet outline of what you will learn.',
      proof_provided: '',
      first_action: 'Open a note and list 2 primary sources (link or book+page) you will use in the next 2 hours.',
      value_score: 8,
      quality_score: 8,
      leverage_score: 8,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'low'
    }),
    outcomeBase({
      title: 'Create a teachable artifact (summary, template, or worked example).',
      why_it_matters: 'Output forces understanding.',
      category: 'learning',
      priority: 2,
      status: 'planned',
      estimated_minutes: 60,
      actual_minutes: 0,
      proof_required: 'PDF/Notion page/MD file with structure: idea → example → your take → 3 practice questions.',
      proof_provided: '',
      first_action: 'Create a new doc titled "Sprint: [topic]" and add section headers: Definition, Example, Where I’ll use it.',
      value_score: 9,
      quality_score: 8,
      leverage_score: 8,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'high'
    }),
    outcomeBase({
      title: 'Self-check + one real application proof.',
      why_it_matters: 'Application is the only learning that counts for work.',
      category: 'learning',
      priority: 3,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: '3-question self-quiz answers + screenshot of you applying the idea in a real file/project.',
      proof_provided: '',
      first_action: 'Write 3 questions you should be able to answer; answer them without looking at notes — then fix gaps.',
      value_score: 8,
      quality_score: 8,
      leverage_score: 7,
      money_potential: 'low',
      urgency: 'low',
      effort: 'medium'
    })
  ];
  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Lock sources before you read.',
    next_move: 'List 2 primary sources.',
    go_here: 'Notes + browser',
    write_make_do: 'Save links and 5 bullet scope in one page.',
    proof_needed: 'Link list + scope bullets visible.',
    avoid: 'Passive reading without notes structure.',
    suggested_action: 'start_focus',
    next_action: 'Create sprint note with sources.',
    suggested_focus_minutes: 15,
    priority_reason: 'Scope beats drift.',
    drift_warning: ''
  };
  return {
    detected_work_type: 'learning',
    plan_title: 'Learning sprint with artifact',
    plan_summary: 'Sources → artifact → quiz → application proof.',
    assumptions: ['You have ~2 hours for deep learning'],
    clarifying_questions: ['Is this for job skills or hobby mastery?'],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    proof_checklist: ['Outline', 'Artifact export', 'Quiz answers', 'Application screenshot'],
    next_move
  };
}

function buildResearchPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Define decision + success criteria for research.',
      why_it_matters: 'Research without a decision deadline never finishes.',
      category: 'other',
      priority: 1,
      status: 'planned',
      estimated_minutes: 20,
      actual_minutes: 0,
      proof_required: 'One paragraph: decision to make + evidence bar + deadline.',
      proof_provided: '',
      first_action: 'Write: “If I find X evidence by EOD, I will decide Y.”',
      value_score: 8,
      quality_score: 8,
      leverage_score: 8,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'low'
    }),
    outcomeBase({
      title: 'Collect 6 sources with credibility tags.',
      why_it_matters: 'Tagged sources speed synthesis.',
      category: 'other',
      priority: 2,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'Table: Source | Claim | Credibility | Link.',
      proof_provided: '',
      first_action: 'Open a spreadsheet with those headers and fill 3 rows from primary sources first.',
      value_score: 8,
      quality_score: 8,
      leverage_score: 8,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Synthesis memo + recommendation.',
      why_it_matters: 'Stakeholders need a decision, not a pile of links.',
      category: 'other',
      priority: 3,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: '1-page memo: options, tradeoffs, recommendation, risks.',
      proof_provided: '',
      first_action: 'Draft section “Recommendation” with one sentence answer before writing supporting bullets.',
      value_score: 8,
      quality_score: 8,
      leverage_score: 7,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'medium'
    })
  ];
  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Frame the decision before more reading.',
    next_move: 'Write decision + evidence bar.',
    go_here: 'Notes',
    write_make_do: 'Complete success criteria paragraph in 5 minutes.',
    proof_needed: 'Paragraph saved.',
    avoid: 'Collecting tabs without criteria.',
    suggested_action: 'start_focus',
    next_action: 'Write criteria now.',
    suggested_focus_minutes: 10,
    priority_reason: 'Criteria prevents endless research.',
    drift_warning: ''
  };
  return {
    detected_work_type: 'research',
    plan_title: 'Decision-driven research',
    plan_summary: 'Criteria → tagged sources → memo.',
    assumptions: ['You need a written output today'],
    clarifying_questions: ['Who is the audience for the memo?'],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    next_move
  };
}

function buildAdminPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Clear highest-risk overdue communication + calendar landmines.',
      why_it_matters: 'Admin debt compounds into missed revenue.',
      category: 'admin',
      priority: 1,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'List of handled threads with timestamps or screenshot of empty “needs reply” folder.',
      proof_provided: '',
      first_action: 'Sort inbox by oldest unreplied — reply or schedule in first 3 threads.',
      value_score: 8,
      quality_score: 8,
      leverage_score: 8,
      money_potential: 'medium',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Update schedule + tomorrow buffer blocks.',
      why_it_matters: 'Protects execution time.',
      category: 'admin',
      priority: 2,
      status: 'planned',
      estimated_minutes: 25,
      actual_minutes: 0,
      proof_required: 'Screenshot of calendar showing protected blocks.',
      proof_provided: '',
      first_action: 'Open calendar and add two 90-minute deep-work blocks for next 48 hours labeled “execution”.',
      value_score: 7,
      quality_score: 7,
      leverage_score: 7,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'low'
    }),
    outcomeBase({
      title: 'Close one recurring-system loop (doc, checklist, or template).',
      why_it_matters: 'Repeatable admin removes future drag.',
      category: 'admin',
      priority: 3,
      status: 'planned',
      estimated_minutes: 35,
      actual_minutes: 0,
      proof_required: 'Link or PDF of template/checklist created.',
      proof_provided: '',
      first_action: 'Pick one repeated annoyance from today and write a 5-step checklist to prevent it next time.',
      value_score: 7,
      quality_score: 7,
      leverage_score: 6,
      money_potential: 'low',
      urgency: 'low',
      effort: 'medium'
    })
  ];
  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Reduce overdue message risk first.',
    next_move: 'Reply oldest unreplied thread.',
    go_here: 'Inbox',
    write_make_do: 'Open oldest unreplied — reply or schedule with explicit next step.',
    proof_needed: 'Screenshot or sent confirmation.',
    avoid: 'Organizing folders before replies.',
    suggested_action: 'start_focus',
    next_action: 'Handle thread #1 now.',
    suggested_focus_minutes: 12,
    priority_reason: 'Oldest debt is highest risk.',
    drift_warning: ''
  };
  return {
    detected_work_type: 'admin',
    plan_title: 'Admin closure day',
    plan_summary: 'Replies → calendar defense → one system template.',
    assumptions: ['You have access to email/calendar'],
    clarifying_questions: [],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    next_move
  };
}

function buildGenericPlan(raw: string, work: DetectedWorkType): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const cat = pickCategory(work);
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: `Execute one concrete outcome from: ${raw.slice(0, 120)}${raw.length > 120 ? '…' : ''}`,
      why_it_matters: 'Execution beats intent.',
      category: cat,
      priority: 1,
      status: 'planned',
      estimated_minutes: 60,
      actual_minutes: 0,
      proof_required: 'Timestamped artifact (screenshot, export, or message) proving completion.',
      proof_provided: '',
      first_action:
        'Rewrite your goal into one measurable sentence with a physical/digital deliverable named explicitly.',
      value_score: 7,
      quality_score: 7,
      leverage_score: 7,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Second priority outcome (only if time permits)',
      why_it_matters: 'Backup keeps momentum if first finishes early.',
      category: cat,
      priority: 2,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'Artifact or log entry.',
      proof_provided: '',
      first_action: 'List blocker risks for outcome #1 in 2 bullets — decide if #2 is still worth same day.',
      value_score: 6,
      quality_score: 6,
      leverage_score: 5,
      money_potential: 'low',
      urgency: 'low',
      effort: 'medium'
    })
  ];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Make the goal measurable before working.',
    next_move: 'Sharpen the goal.',
    go_here: 'Notes',
    write_make_do: 'Replace vague verbs with one deliverable name + proof format.',
    proof_needed: 'Written acceptance sentence.',
    avoid: 'Starting without naming proof.',
    suggested_action: 'start_focus',
    next_action: 'Write acceptance + proof now.',
    suggested_focus_minutes: 10,
    priority_reason: 'Clarity reduces rework.',
    drift_warning: ''
  };

  return {
    detected_work_type: work,
    plan_title: 'Focused execution',
    plan_summary: raw.trim() ? `Plan derived from: ${raw.slice(0, 200)}` : 'Define your primary outcome and proof.',
    assumptions: ['You have ~2–4 hours of deep work available'],
    clarifying_questions: ['What single artifact proves you won the day?'],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    next_move
  };
}

function workflowFromPlan(input: PlanBuilderInput, output: Omit<PlanBuilderOutput, 'playbook'>): Workflow {
  const goal = input.raw_goal.slice(0, 200);
  const steps: WorkflowStep[] = [
    {
      step_number: 1,
      title: 'Clarify scope and proof',
      instructions: 'Write success criteria and proof artifact format.',
      expected_state: 'Acceptance note saved.',
      visual_checks: ['Proof format chosen'],
      common_mistakes: ['Skipping proof definition'],
      troubleshooting: ['Narrow scope'],
      completion_criteria: 'Acceptance + proof listed.'
    },
    {
      step_number: 2,
      title: 'Execute primary work block',
      instructions: 'Do the core labor with timebox; capture interim notes.',
      expected_state: 'Primary artifact exists.',
      visual_checks: ['Visible progress'],
      common_mistakes: ['Context switching'],
      troubleshooting: ['Shorten scope'],
      completion_criteria: 'Artifact matches acceptance.'
    },
    {
      step_number: 3,
      title: 'Verify and publish proof',
      instructions: 'Attach screenshots/logs/links as required.',
      expected_state: 'Proof stored shareably.',
      visual_checks: ['Proof readable'],
      common_mistakes: ['Missing timestamps'],
      troubleshooting: ['Retake proof'],
      completion_criteria: 'Proof passes checklist.'
    }
  ];

  if (output.schedule_blocks?.length) {
    output.schedule_blocks.slice(0, 5).forEach((b, i) => {
      steps.push({
        step_number: steps.length + 1,
        title: b.label,
        instructions: b.notes || `Timebox ~${b.duration_minutes || 30} minutes.`,
        expected_state: 'Checkpoint note added.',
        visual_checks: [],
        common_mistakes: [],
        troubleshooting: [],
        completion_criteria: 'Done or blocker logged.'
      });
    });
  }

  const slug = goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'playbook';

  return {
    id: slug,
    workflow_name: output.plan_title || `${goal} Playbook`,
    category: (input.category as WorkflowCategory) || 'productivity',
    difficulty: 'intermediate',
    estimated_time: '60–120 minutes',
    required_tools: output.tools_needed || [],
    required_materials: [],
    prerequisites: [],
    steps,
    completion_criteria: output.plan_summary,
    report_template: {
      summary: output.plan_summary,
      issues_found: [],
      fixes_made: [],
      recommendations: ['Iterate playbook after first run']
    },
    source_type: 'user-created'
  };
}

/** Core planner: deterministic templates + work-type routing */
export function buildPlan(input: PlanBuilderInput): PlanBuilderOutput {
  const raw = input.raw_goal.trim();
  const classified = classifyGoal(raw + ' ' + (input.context || ''));
  const work = input.detected_work_type_override || classified;
  const entities = extractEntities(raw);
  const _template = choosePlanTemplate(work);

  let partial: Omit<PlanBuilderOutput, 'playbook'> & { next_move: DailyNextMoveResponse };

  switch (work) {
    case 'service_day':
      partial = buildServicePlan(raw, input.time_horizon);
      break;
    case 'hardware_setup':
      partial = buildHardwarePlan(raw);
      break;
    case 'sales_day':
      partial = buildSalesPlan(raw);
      break;
    case 'app_build':
      partial = buildAppBuildPlan(raw);
      break;
    case 'learning':
      partial = buildLearningPlan(raw);
      break;
    case 'research':
      partial = buildResearchPlan(raw);
      break;
    case 'admin':
      partial = buildAdminPlan(raw);
      break;
    case 'personal':
      partial = buildGenericPlan(raw, 'personal');
      break;
    case 'client_work_day':
      partial = buildGenericPlan(raw, 'client_work_day');
      break;
    default:
      partial = buildGenericPlan(raw, 'custom');
  }

  partial.detected_work_type = work;
  partial.extracted_entities = entities;
  const specificity = scoreSpecificity(raw, partial.daily_outcomes || [], work);
  partial.specificity_score = specificity.score;
  partial.specificity_label = specificity.label;
  if (specificity.label === 'weak') {
    const tightened = (partial.daily_outcomes || []).map((o) => ({
      ...o,
      first_action: concreteFirstAction(o.first_action || '', `Open the exact tool/location and write step 1 for: ${o.title}`),
      proof_required: o.proof_required || 'Capture one concrete proof artifact.'
    }));
    partial.daily_outcomes = tightened;
    partial.today_missions = tightened.map(toMission);
  }
  if (/run a successful 3[- ]car mobile detailing day tomorrow/i.test(raw)) {
    partial.generated_from_test_prompt = true;
  }

  const result: PlanBuilderOutput = {
    ...partial,
    playbook: input.mode === 'playbook' ? workflowFromPlan(input, partial) : undefined
  };

  return result;
}

export { WORK_TYPE_LABELS };
