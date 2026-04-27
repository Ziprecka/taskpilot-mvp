import type {
  DailyOutcome,
  Workflow,
  WorkflowCategory,
  WorkflowStep
} from '@/types/workflow';
import type {
  DetectedWorkType,
  MessageTemplate,
  PlanBuilderInput,
  PlanBuilderOutput,
  PlanTimeHorizon,
  RiskPlanItem,
  ScheduleBlock,
  DailyNextMoveResponse
} from '@/types/planBuilder';

const WORK_TYPE_LABELS: Record<DetectedWorkType, string> = {
  service_business_day: 'Service Business Day',
  sales_outreach_day: 'Sales / Outreach Day',
  app_build_day: 'App / Build Day',
  hardware_setup_day: 'Hardware Setup Day',
  research_day: 'Research Day',
  admin_cleanup_day: 'Admin / Cleanup Day',
  learning_day: 'Learning Day',
  personal_day: 'Personal Day',
  generic_productivity: 'General Productivity'
};

const GENERIC_FIRST_ACTION_BAN =
  /^(start a 5-minute first move|make progress|work on the task|begin by focusing|continue current mission)/i;

export function workTypeLabel(type: DetectedWorkType): string {
  return WORK_TYPE_LABELS[type] || WORK_TYPE_LABELS.generic_productivity;
}

export function detectWorkType(raw: string): DetectedWorkType {
  const s = raw.toLowerCase();
  if (!s.trim()) return 'generic_productivity';

  const hardwareHints =
    /\b(atom|arduino|esp32|esp-?32|com port|device manager|usb serial|flash|firmware|gpio|sensor|breadboard|wiring|driver\b|raspberry|mcu|iot)\b/i;
  const serviceHints =
    /\b(detail|detailing|mobile detail|car wash|appointment|customer|before.?after|van|route|detailing truck|wax|ceramic|buff)\b/i;
  const salesHints =
    /\b(beta user|beta users|get users|outreach|prospect|cold email|sales|pipeline|demo booking|linkedin|dm\b|lead)\b/i;
  const buildHints =
    /\b(next\.?js|react|typescript|deploy|vercel|component|pull request|commit|route\b|page\.tsx|feature flag|bug fix)\b/i;
  const researchHints =
    /\b(research|sources|literature review|compare vendors|survey)\b/i;
  const adminHints =
    /\b(inbox|calendar|schedule|tax|invoice|cleanup|organize desk|clear backlog)\b/i;
  const learningHints =
    /\b(course|lesson|quiz|study|notes|flashcard|certification)\b/i;
  const personalHints =
    /\b(gym|health|family|appointment personal|home)\b/i;

  const score = (re: RegExp) => (re.test(s) ? 1 : 0);

  const scores: Record<DetectedWorkType, number> = {
    hardware_setup_day:
      score(hardwareHints) * 4 +
      (/\b(s3r|atom)\b/i.test(s) ? 6 : 0) +
      (/\b(api|robot)\b/i.test(s) ? 2 : 0),
    service_business_day:
      score(serviceHints) * 4 +
      (/\b\d\s*car|\d+\s*cars|three car|mobile\b/i.test(s) ? 5 : 0),
    sales_outreach_day:
      score(salesHints) * 4 +
      (/\bbeta\b/i.test(s) ? 3 : 0),
    app_build_day: score(buildHints) * 4 + (/\b(ship|deploy|fix ux)\b/i.test(s) ? 2 : 0),
    research_day: score(researchHints) * 4,
    admin_cleanup_day: score(adminHints) * 4,
    learning_day: score(learningHints) * 4,
    personal_day: score(personalHints) * 4,
    generic_productivity: 0
  };

  let best: DetectedWorkType = 'generic_productivity';
  let max = -1;
  (Object.keys(scores) as DetectedWorkType[]).forEach((k) => {
    if (scores[k] > max) {
      max = scores[k];
      best = k;
    }
  });
  if (max < 2) return 'generic_productivity';
  return best;
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
  if (work === 'sales_outreach_day' || work === 'service_business_day') return 'money';
  if (work === 'learning_day') return 'learning';
  if (work === 'admin_cleanup_day') return 'admin';
  if (work === 'personal_day') return 'health';
  if (work === 'hardware_setup_day' || work === 'app_build_day') return 'build';
  return 'other';
}

function leverageFor(work: DetectedWorkType, idx: number): number {
  const base =
    work === 'generic_productivity'
      ? 6
      : work === 'service_business_day' || work === 'sales_outreach_day'
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

function extractHardwarePrimary(raw: string): string {
  const m = raw.match(/\b(Atom\s*S3R|ESP32|Arduino\s*\w+|Raspberry\s*Pi\s*\w*)\b/i);
  return m ? m[1] : 'device';
}

function extractSideQuest(raw: string): string | null {
  const lower = raw.toLowerCase();
  const idx = lower.indexOf('also');
  if (idx === -1) return null;
  const tail = raw.slice(idx + 4).trim();
  if (tail.length < 8) return null;
  return tail.replace(/^[,.\s]+/, '');
}

function buildServiceBusinessPlan(raw: string, horizon: PlanTimeHorizon): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const cars = parseCarCount(raw);
  const when = horizon === 'tomorrow' ? 'tomorrow' : 'today';

  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: `Prep van, supplies, route, and customer briefing before first ${when}'s appointments (${cars} jobs).`,
      why_it_matters: 'Field days fail when loading and routing are guessed on-site.',
      category: 'money',
      priority: 1,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: `Photo of loaded supplies + written route sheet with addresses, arrival windows, and job order for ${cars} vehicles.`,
      proof_provided: '',
      first_action:
        'Open your calendar/booking app and write each customer name, address, service package, arrival target, and estimated finish time for every appointment.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('service_business_day', 0),
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium'
    }),
    outcomeBase({
      title: `Execute ${cars} complete details with before/after proof and timely customer messaging.`,
      why_it_matters: 'Proof + communication reduce disputes and drive reviews.',
      category: 'money',
      priority: 2,
      status: 'planned',
      estimated_minutes: cars * 90,
      actual_minutes: 0,
      proof_required: `Per vehicle: exterior before, interior before, worst-area close-up, exterior after, interior after, detail shot; plus screenshot or copy of completion text sent.`,
      proof_provided: '',
      first_action:
        'Before starting vehicle #1, send an “on my way” message with ETA and parking note using your saved template.',
      value_score: 9,
      quality_score: 8,
      leverage_score: leverageFor('service_business_day', 1),
      money_potential: 'high',
      urgency: 'high',
      effort: 'high'
    }),
    outcomeBase({
      title: 'Turn completed jobs into repeat revenue and reviews.',
      why_it_matters: 'Same-day follow-up captures upsells while memory is fresh.',
      category: 'money',
      priority: 3,
      status: 'planned',
      estimated_minutes: 35,
      actual_minutes: 0,
      proof_required:
        'For each customer: upsell/maintenance note saved + review request sent + logged recommendation for next visit.',
      proof_provided: '',
      first_action:
        'Create a 3-row mini tracker: Customer | Upsell offered | Review ask sent (Y/N) — fill after each job.',
      value_score: 8,
      quality_score: 8,
      leverage_score: leverageFor('service_business_day', 2),
      money_potential: 'high',
      urgency: 'medium',
      effort: 'low'
    })
  ];

  const schedule_blocks: ScheduleBlock[] = [
    { id: 'sb1', label: 'Tonight: supplies + route sheet', duration_minutes: 30 },
    { id: 'sb2', label: 'Morning loadout + weather/traffic check', duration_minutes: 20 },
    { id: 'sb3', label: 'Pre-route prep + messages', duration_minutes: 15 },
    { id: 'sb4', label: 'Drive / Job 1', duration_minutes: 90 },
    { id: 'sb5', label: 'Drive / Job 2', duration_minutes: 90 },
    { id: 'sb6', label: cars >= 3 ? 'Drive / Job 3' : 'Buffer / admin', duration_minutes: 90 },
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
      label: 'Completion + payment',
      body: 'All set — after photos attached. Total [amount]. Payment link: [link]. Thanks again!'
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
    'Each vehicle: exterior before',
    'Interior before',
    'Worst area close-up',
    'Exterior after',
    'Interior after',
    'Hero detail shot',
    'Completion message sent',
    'Upsell / next visit note logged'
  ];

  const risk_plan: RiskPlanItem[] = [
    { risk: 'Running behind schedule', mitigation: 'Send ETA update + trim non-essential steps but never skip proof photos.' },
    { risk: 'Weather / lighting hurts photos', mitigation: 'Use consistent angles + flash note in customer message.' }
  ];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Confirm appointments and route before you load the van.',
    next_move: `Confirm ${when}'s ${cars} appointments.`,
    go_here: 'Calendar + route sheet',
    write_make_do:
      'List address, service, arrival time, and expected duration per vehicle; check drive times between stops.',
    proof_needed: 'Screenshot or photo of completed route/timing list.',
    avoid: 'Leaving without a written sequence of jobs.',
    suggested_action: 'start_focus',
    next_action: 'Build the route and timing list now.',
    suggested_focus_minutes: 10,
    priority_reason: 'Route clarity prevents cascading delays.',
    drift_warning: ''
  };

  return {
    detected_work_type: 'service_business_day',
    plan_title: `Mobile detailing field day (${cars} vehicles)`,
    plan_summary: `Prep → execute ${cars} jobs with photo proof → same-day upsell/review loop → van reset.`,
    assumptions: [
      `You already have ${cars} bookings or intend to finish ${cars} vehicles ${when}.`,
      'Customers can receive SMS/email updates.'
    ],
    clarifying_questions: [
      'Are payments on-site or invoice after photos?',
      'Do you need water/electric hookups confirmed per stop?'
    ],
    daily_outcomes: outcomes,
    schedule_blocks,
    proof_checklist,
    message_templates,
    risk_plan,
    next_move
  };
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
      leverage_score: leverageFor('hardware_setup_day', 0),
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
      leverage_score: leverageFor('hardware_setup_day', 1),
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
      leverage_score: leverageFor('hardware_setup_day', 2),
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
    detected_work_type: 'hardware_setup_day',
    plan_title: `${device} bring-up + Robot API hook`,
    plan_summary: 'Enumerate → flash test → API smoke → notes; optional miner side quest is strictly timeboxed.',
    assumptions: ['USB cable supports data', 'Developer machine can install drivers'],
    clarifying_questions: ['Which OS are you flashing from?', 'Do you already have Robot API credentials in `.env.local`?'],
    daily_outcomes: outcomes.slice(0, 6),
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
      leverage_score: leverageFor('sales_outreach_day', 0),
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
      leverage_score: leverageFor('sales_outreach_day', 1),
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
      leverage_score: leverageFor('sales_outreach_day', 2),
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
    detected_work_type: 'sales_outreach_day',
    plan_title: 'Beta acquisition sprint',
    plan_summary: 'ICP → tracker → 10 sends with proof → capture replies.',
    assumptions: ['You have at least one channel (email/DM) to reach prospects'],
    clarifying_questions: ['Which segment are you prioritizing first (builders vs ops vs agencies)?'],
    daily_outcomes: outcomes,
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
      leverage_score: leverageFor('app_build_day', 0),
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
      leverage_score: leverageFor('app_build_day', 1),
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
      leverage_score: leverageFor('app_build_day', 2),
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
    detected_work_type: 'app_build_day',
    plan_title: 'Ship one scoped product change',
    plan_summary: 'Define acceptance → implement + test → deploy/preview + release note.',
    assumptions: ['Repo builds locally'],
    clarifying_questions: ['Is this user-facing or internal-only change?'],
    daily_outcomes: outcomes,
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
    detected_work_type: 'learning_day',
    plan_title: 'Learning sprint with artifact',
    plan_summary: 'Sources → artifact → quiz → application proof.',
    assumptions: ['You have ~2 hours for deep learning'],
    clarifying_questions: ['Is this for job skills or hobby mastery?'],
    daily_outcomes: outcomes,
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
    detected_work_type: 'research_day',
    plan_title: 'Decision-driven research',
    plan_summary: 'Criteria → tagged sources → memo.',
    assumptions: ['You need a written output today'],
    clarifying_questions: ['Who is the audience for the memo?'],
    daily_outcomes: outcomes,
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
    detected_work_type: 'admin_cleanup_day',
    plan_title: 'Admin closure day',
    plan_summary: 'Replies → calendar defense → one system template.',
    assumptions: ['You have access to email/calendar'],
    clarifying_questions: [],
    daily_outcomes: outcomes,
    next_move
  };
}

function buildGenericPlan(raw: string, work: DetectedWorkType): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const cat = pickCategory(work);
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: `Ship one concrete outcome from: ${raw.slice(0, 120)}${raw.length > 120 ? '…' : ''}`,
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
  const work = input.detected_work_type_override || detectWorkType(raw + ' ' + (input.context || ''));

  let partial: Omit<PlanBuilderOutput, 'playbook'> & { next_move: DailyNextMoveResponse };

  switch (work) {
    case 'service_business_day':
      partial = buildServiceBusinessPlan(raw, input.time_horizon);
      break;
    case 'hardware_setup_day':
      partial = buildHardwarePlan(raw);
      break;
    case 'sales_outreach_day':
      partial = buildSalesPlan(raw);
      break;
    case 'app_build_day':
      partial = buildAppBuildPlan(raw);
      break;
    case 'learning_day':
      partial = buildLearningPlan(raw);
      break;
    case 'research_day':
      partial = buildResearchPlan(raw);
      break;
    case 'admin_cleanup_day':
      partial = buildAdminPlan(raw);
      break;
    case 'personal_day':
      partial = buildGenericPlan(raw, 'personal_day');
      break;
    default:
      partial = buildGenericPlan(raw, 'generic_productivity');
  }

  partial.detected_work_type = work;

  const result: PlanBuilderOutput = {
    ...partial,
    playbook: input.mode === 'playbook' ? workflowFromPlan(input, partial) : undefined
  };

  return result;
}

export { WORK_TYPE_LABELS };
