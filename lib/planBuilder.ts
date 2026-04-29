import type { DailyOutcome, Workflow, WorkflowCategory, WorkflowStep } from '@/types/workflow';
import type {
  DailyNextMoveResponse,
  DetectedWorkType,
  GoalIntent,
  GoalIntentDetection,
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
  service_business_sales: 'Service Business Sales',
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
  'rewrite your goal',
  'define your goal',
  'make one concrete outcome',
  'execute one concrete outcome',
  'second priority outcome',
  'do one task',
  'start a 5-minute first move',
  'make progress',
  'work on this',
  'improve workflow',
  'continue current mission',
  'ship one scoped feature',
  'fix one visible ux issue'
];
const GENERIC_FIRST_ACTION_BAN = new RegExp(`^(${BAD_GENERIC_PHRASES.join('|')})`, 'i');
const GENERIC_PLAN_BAN_RE = new RegExp(BAD_GENERIC_PHRASES.join('|'), 'i');

export function workTypeLabel(type: DetectedWorkType): string {
  return WORK_TYPE_LABELS[type] || WORK_TYPE_LABELS.custom;
}

export function detectWorkType(raw: string): DetectedWorkType {
  const s = raw.toLowerCase();
  if (!s.trim()) return 'custom';
  const has = (re: RegExp) => re.test(s);
  if (has(/\b(leads?|customers?|bookings?|quote requests?|follow up|yelp|instagram leads?|facebook groups?|outreach|prospect)\b/)) return 'service_business_sales';
  if (has(/\b(service day|appointment|appointments|scheduled jobs?|3 car|route day|loadout|car detail|detailing day|tomorrow.?jobs?)\b/)) return 'service_day';
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

function extractActions(raw: string): string[] {
  const verbs = ['organize', 'build', 'ship', 'fix', 'launch', 'grow', 'set up', 'setup', 'send', 'clean', 'test', 'deploy', 'flash', 'sort'];
  const s = raw.toLowerCase();
  return verbs.filter((v) => s.includes(v)).slice(0, 8);
}

function extractConstraints(raw: string): string[] {
  const out: string[] = [];
  const s = raw.toLowerCase();
  if (/\b(today|tonight|tomorrow|weekend|this week)\b/.test(s)) out.push('timeframe');
  if (/\b(\d+)\b/.test(s)) out.push('numeric target');
  if (/\bwithout|only|no\b/.test(s)) out.push('constraint language');
  return out;
}

function selectedCategoryToIntent(selected: string): GoalIntent {
  const s = String(selected || '').toLowerCase();
  if (s.includes('service')) return 'service_day';
  if (s.includes('sales')) return 'service_business_sales';
  if (s.includes('build') || s.includes('saas')) return 'saas_build';
  if (s.includes('hardware') || s.includes('robot')) return 'hardware_debug';
  if (s.includes('research')) return 'research_project';
  if (s.includes('learning')) return 'learning_plan';
  if (s.includes('admin')) return 'admin_cleanup';
  if (s.includes('personal')) return 'personal_health';
  return 'custom_execution';
}

function mapIntentToWorkType(intent: GoalIntent): DetectedWorkType {
  if (intent === 'service_day') return 'service_day';
  if (intent === 'service_business_sales' || intent === 'social_growth') return 'service_business_sales';
  if (intent === 'saas_build') return 'app_build';
  if (intent === 'electronics_project' || intent === 'hardware_debug' || intent === 'robotics_project') return 'hardware_setup';
  if (intent === 'research_project') return 'research';
  if (intent === 'learning_plan') return 'learning';
  if (intent === 'admin_cleanup' || intent === 'finance_recovery') return 'admin';
  if (intent === 'personal_health') return 'personal';
  return 'custom';
}

export function detectGoalIntent(rawGoal: string, selectedCategory: string): GoalIntentDetection {
  const raw = rawGoal.trim();
  const s = raw.toLowerCase();
  const entities = extractEntities(raw);
  const actions = extractActions(raw);
  const constraints = extractConstraints(raw);
  const selectedIntent = selectedCategoryToIntent(selectedCategory);
  let intent: GoalIntent = 'custom_execution';
  let reason = 'No strong keywords yet.';
  let confidence = 0.45;

  if (/\b(garage|workbench|workspace|shelves|storage|tools|supplies|organize)\b/.test(s)) {
    intent = 'workspace_organization';
    reason = 'Goal mentions garage/workspace organization entities.';
    confidence = 0.94;
  } else if (/\b(grow x|followers|posts?|engage|account)\b/.test(s)) {
    intent = 'social_growth';
    reason = 'Goal targets social account growth actions.';
    confidence = 0.9;
  } else if (/\b(sensor|esp32|breadboard|wiring|serial|display|electronics)\b/.test(s)) {
    intent = 'electronics_project';
    reason = 'Goal includes electronics parts/firmware language.';
    confidence = 0.9;
  } else if (/\b(robot|atom s3r|deskbot|firmware|screen|com port)\b/.test(s)) {
    intent = 'hardware_debug';
    reason = 'Goal includes robot/hardware debug keywords.';
    confidence = 0.88;
  } else if (/\b(saas|feature|route|component|api|deploy|release)\b/.test(s)) {
    intent = 'saas_build';
    reason = 'Goal targets software shipping behavior.';
    confidence = 0.88;
  } else if (/\b(leads?|bookings?|outreach|prospect|dm|quote requests?|detailing)\b/.test(s)) {
    intent = /(\bappointment|jobs?|route|3 car|tomorrow\b)/.test(s) ? 'service_day' : 'service_business_sales';
    reason = intent === 'service_day' ? 'Goal explicitly references scheduled jobs/service-day signals.' : 'Goal targets lead-generation and outreach.';
    confidence = 0.9;
  } else if (/\b(invoice|overdue|payment|unpaid)\b/.test(s)) {
    intent = 'finance_recovery';
    reason = 'Goal references unpaid invoice/payment recovery.';
    confidence = 0.86;
  } else if (/\b(research|compare|evaluate)\b/.test(s)) {
    intent = 'research_project';
    reason = 'Goal asks for research/evaluation work.';
    confidence = 0.82;
  } else if (/\b(learn|course|study)\b/.test(s)) {
    intent = 'learning_plan';
    reason = 'Goal references learning progression.';
    confidence = 0.8;
  } else if (/\b(clean up|admin|organize docs|calendar|inbox)\b/.test(s)) {
    intent = 'admin_cleanup';
    reason = 'Goal references admin cleanup operations.';
    confidence = 0.8;
  } else if (/\b(health|workout|sleep)\b/.test(s)) {
    intent = 'personal_health';
    reason = 'Goal references personal health outcomes.';
    confidence = 0.78;
  }

  const missing_info =
    raw.length < 6 || /^(do better|fix it|make this work|project|stuff)$/i.test(raw)
      ? ['What object are you trying to improve?']
      : [];

  const categoryConflict = selectedIntent !== 'custom_execution' && selectedIntent !== intent && confidence >= 0.72;
  return {
    intent,
    confidence,
    selected_category: selectedCategory || 'unspecified',
    category_conflict: categoryConflict,
    reason,
    extracted_entities: entities,
    extracted_actions: actions,
    extracted_constraints: constraints,
    missing_info: missing_info.length
      ? missing_info
      : raw.split(/\s+/).length <= 2 && intent === 'custom_execution'
        ? ['Do you mean grow followers, get sales, or finish a project?']
        : []
  };
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
  if (work === 'sales_day' || work === 'service_day' || work === 'service_business_sales' || work === 'client_work_day') return 'money';
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
      : work === 'service_day' || work === 'sales_day' || work === 'service_business_sales'
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

type GoalExpansion = {
  interpreted_goal: string;
  work_type: DetectedWorkType;
  target_result: string;
  likely_tools: string[];
  proof_examples: string[];
  assumption: string;
};

export function expandVagueGoal(goal: string, userContext?: string): GoalExpansion {
  const raw = `${goal} ${userContext || ''}`.trim().toLowerCase();
  if (/\bfind new leads for details\b|\bdetailing\b.*\bleads?\b|\bleads?\b.*\bdetail/i.test(raw)) {
    return {
      interpreted_goal: 'Generate new mobile detailing leads and start outreach.',
      work_type: 'service_business_sales',
      target_result: '25 prospects found, 5 contacted, proof logged.',
      likely_tools: ['Google Maps', 'Yelp', 'Instagram', 'Facebook Groups', 'Google Sheets'],
      proof_examples: ['Prospect tracker screenshot', 'Sent DM screenshot', 'Lead list export'],
      assumption: 'You want more mobile detailing leads.'
    };
  }
  if (/\bget more customers\b/.test(raw)) {
    return {
      interpreted_goal: 'Run a local outreach push to start customer conversations.',
      work_type: 'service_business_sales',
      target_result: 'Prospect list + sent outreach + follow-up path.',
      likely_tools: ['Google Maps', 'Instagram', 'Sheets'],
      proof_examples: ['Outreach screenshots', 'Tracker rows'],
      assumption: 'You want customer conversations this week.'
    };
  }
  if (/\bmake money today\b/.test(raw)) {
    return {
      interpreted_goal: 'Pick one near-term revenue action, send offers/messages, and log proof.',
      work_type: 'sales_day',
      target_result: 'Offers sent + proof logged.',
      likely_tools: ['DM', 'Email', 'Sheets'],
      proof_examples: ['Sent proof', 'Reply capture'],
      assumption: 'You need immediate revenue actions.'
    };
  }
  if (/\bwork on my app\b/.test(raw)) {
    return {
      interpreted_goal: 'Ship one visible app improvement, test it, deploy it, and record proof.',
      work_type: 'app_build',
      target_result: 'One shipped change with build + screenshot proof.',
      likely_tools: ['IDE', 'npm', 'Vercel'],
      proof_examples: ['Build output', 'UI screenshot'],
      assumption: 'You want one concrete shipped improvement.'
    };
  }
  if (/\bfix my robot\b/.test(raw)) {
    return {
      interpreted_goal: 'Identify robot failure, patch one code path, and verify with proof.',
      work_type: 'hardware_setup',
      target_result: 'Repro + fix + verification proof.',
      likely_tools: ['Serial monitor', 'Robot API', 'IDE'],
      proof_examples: ['API response', 'Serial screenshot'],
      assumption: 'You want one reproducible robot behavior fixed.'
    };
  }
  return {
    interpreted_goal: goal.trim() || 'Create a practical today plan with proof.',
    work_type: detectWorkType(goal),
    target_result: 'Three concrete missions with proof.',
    likely_tools: ['TaskPilot'],
    proof_examples: ['Screenshot', 'Checklist completion'],
    assumption: 'Interpreted from your goal text.'
  };
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
  const lowerGoal = raw.toLowerCase();
  const text = outcomes.map((o) => `${o.title} ${o.first_action} ${o.proof_required}`).join(' ').toLowerCase();
  let score = 0;
  const entities = extractEntities(raw);
  const relevanceHits = entities.filter((e) => text.includes(e.toLowerCase())).length;
  if (relevanceHits >= 2) score += 3;
  if (/\b(open|write|list|send|create|load|confirm|plug|run|flash|sort|publish|engage)\b/.test(text)) score += 2;
  if (/\bphoto|screenshot|sheet|message|checklist|calendar|serial|commit|deploy|before\/after\b/.test(text)) score += 2;
  const missionDiversity = new Set(outcomes.map((o) => (o.title || '').split(' ')[0].toLowerCase())).size;
  if (missionDiversity >= 3) score += 2;
  if (!GENERIC_PLAN_BAN_RE.test(text)) score += 1;
  const unrelated =
    /\b(customer|vehicle|route|detailing)\b/.test(text) && /\b(garage|workspace|workbench)\b/.test(lowerGoal)
      ? 4
      : /\b(garage|workspace|workbench)\b/.test(text) && /\b(detail|customer|route|vehicle)\b/.test(lowerGoal)
        ? 4
        : 0;
  score = Math.max(0, score - unrelated);
  if (score >= 8) return { score, label: 'strong' };
  if (score >= 5) return { score, label: 'good' };
  return { score, label: 'weak' };
}

function choosePlanTemplate(work: DetectedWorkType): string {
  if (work === 'service_day') return 'service_operating_plan';
  if (work === 'service_business_sales') return 'service_business_sales_plan';
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

function buildServiceBusinessSalesPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Build a 25-lead prospect list',
      objective: 'Create a real list of people or businesses likely to book mobile detailing.',
      why_it_matters: 'A real list is the base for actual outreach and bookings.',
      category: 'money',
      priority: 1,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'Screenshot or CSV of tracker with at least 10 prospects.',
      proof_provided: '',
      first_action: 'Open Google Maps/Yelp/Instagram and find 10 local prospects who own vehicles or manage customer vehicles.',
      checklist: ['Search 3 lead sources', 'Add name/account/business', 'Add contact method', 'Add reason they fit', 'Mark DM/email/call status'],
      done_when: '10+ real prospects are logged.',
      short_title: '25-lead list',
      leverage_score: 9,
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium',
      value_score: 9,
      quality_score: 9,
      risk: 'Low-fit leads waste outreach time.'
    }),
    outcomeBase({
      title: 'Send 5 targeted outreach messages',
      objective: 'Start real sales conversations instead of only collecting names.',
      why_it_matters: 'Conversations create quotes and bookings.',
      category: 'money',
      priority: 2,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: 'Screenshots of sent messages or tracker rows marked sent.',
      proof_provided: '',
      first_action: 'Use the outreach template and send 5 personalized messages.',
      checklist: ['Choose 5 best-fit leads', 'Personalize first line', 'Send message', 'Log sent status', 'Set follow-up date'],
      done_when: '5 messages are sent and tracked.',
      short_title: 'Send 5 messages',
      leverage_score: 9,
      money_potential: 'high',
      urgency: 'high',
      effort: 'medium',
      value_score: 9,
      quality_score: 8,
      risk: 'Generic messages lower reply rate.'
    }),
    outcomeBase({
      title: 'Create follow-up and booking path',
      objective: 'Turn replies into quotes, bookings, reviews, or maintenance offers.',
      why_it_matters: 'Follow-up converts replies into revenue.',
      category: 'money',
      priority: 3,
      status: 'planned',
      estimated_minutes: 35,
      actual_minutes: 0,
      proof_required: 'Templates saved in tracker or TaskPilot.',
      proof_provided: '',
      first_action: 'Write one reply template for interested leads and one follow-up template for no response.',
      checklist: ['Draft interested reply', 'Draft no-response follow-up', 'Add booking link', 'Add next follow-up date'],
      done_when: 'Follow-up system is ready.',
      short_title: 'Follow-up path',
      leverage_score: 8,
      money_potential: 'high',
      urgency: 'medium',
      effort: 'low',
      value_score: 8,
      quality_score: 8,
      risk: 'No follow-up means lost warm leads.'
    })
  ];

  const message_templates: MessageTemplate[] = [
    { id: 'sb1', label: 'DM opener', body: 'Hey [Name] — I run a mobile detailing service nearby. I can come to you this week. Want a quick quote?' },
    { id: 'sb2', label: 'Follow-up', body: 'Quick follow-up in case this got buried — want me to send pricing/options?' },
    { id: 'sb3', label: 'Quote handoff', body: 'Based on your vehicle, estimated range is [range]. If this works, pick a slot here: [booking link].' },
    { id: 'sb4', label: 'Booking link', body: 'Book here: [booking link]. I’ll confirm your address and arrival window right after.' }
  ];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Start by building the first 10 real prospects.',
    next_move: 'Build first 10 prospect rows.',
    go_here: 'Google Maps/Yelp/Instagram + tracker',
    write_make_do: 'Open your tracker and fill 10 rows with name, source, contact, and fit reason.',
    proof_needed: 'Screenshot of tracker with 10 rows.',
    avoid: 'Rewriting your goal instead of prospecting.',
    suggested_action: 'start_focus',
    next_action: 'Find and log prospect #1 now.',
    suggested_focus_minutes: 15,
    priority_reason: 'List quality drives outreach results.',
    drift_warning: ''
  };

  return {
    detected_work_type: 'service_business_sales',
    interpreted_goal: 'Generate new mobile detailing leads and start outreach.',
    plan_title: 'Service business lead generation sprint',
    plan_summary: 'Build leads, send outreach, and set follow-up with proof.',
    assumptions: [
      'You want more mobile detailing leads.',
      'You need a prospect list and sent outreach proof.'
    ],
    clarifying_questions: [],
    sections: [
      { id: 'original', title: 'Original', items: [raw || 'No goal provided'] },
      { id: 'interpreted', title: 'TaskPilot interpreted this as', items: ['Generate new mobile detailing leads and start outreach.'] },
      { id: 'assumption', title: 'Assumptions', items: ['You want potential customers for your detailing service.', 'Proof should be tracker rows, sent DMs, or screenshots.'] },
      { id: 'missions', title: 'Missions', items: outcomes.map((o) => o.title) }
    ],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    message_templates,
    prospect_columns: ['Name', 'Source', 'Contact', 'Fit Reason', 'Message Sent', 'Follow-up Date'],
    success_metrics: ['10 prospects logged', '5 messages sent', 'Follow-up templates ready'],
    next_move
  };
}

function buildWorkspaceOrganizationPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Clear one workbench zone',
      objective: 'Create a usable surface for weekend projects.',
      why_it_matters: 'You can only build when one zone is physically usable.',
      category: 'build',
      priority: 1,
      status: 'planned',
      estimated_minutes: 35,
      actual_minutes: 0,
      proof_required: 'Before/after photo of cleared workbench.',
      proof_provided: '',
      first_action: 'Take a before photo, choose one workbench/table area, and remove everything that does not belong there.',
      checklist: ['Take before photo', 'Pick one work surface', 'Move trash/recycling out', 'Move unrelated items to temporary sort pile', 'Wipe surface'],
      done_when: 'One usable work surface is clear and photographed.',
      leverage_score: 9,
      money_potential: 'low',
      urgency: 'high',
      effort: 'medium',
      risk: 'Trying to organize the entire garage at once.'
    }),
    outcomeBase({
      title: 'Sort tools and supplies into 3 zones',
      objective: 'Make workspace usable without buying storage.',
      why_it_matters: 'Zoning removes setup friction for future project sessions.',
      category: 'build',
      priority: 2,
      status: 'planned',
      estimated_minutes: 40,
      actual_minutes: 0,
      proof_required: 'Photo showing three visible zones.',
      proof_provided: '',
      first_action: 'Create three zones: tools, supplies/materials, and active projects.',
      checklist: ['Group hand tools', 'Group consumables/materials', 'Stage active project bin', 'Label or photograph each zone'],
      done_when: 'Three zones are clearly identifiable.',
      leverage_score: 8,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'medium',
      risk: 'Over-labeling before grouping.'
    }),
    outcomeBase({
      title: 'Remove trash and stage active project area',
      objective: 'End with a workspace ready for the next project.',
      why_it_matters: 'A ready workspace increases probability of immediate execution.',
      category: 'build',
      priority: 3,
      status: 'planned',
      estimated_minutes: 25,
      actual_minutes: 0,
      proof_required: 'Trash removed + final wide after photo.',
      proof_provided: '',
      first_action: 'Throw away obvious trash and set one active project in the cleared area.',
      checklist: ['Fill one trash/recycle bag', 'Remove bag from garage', 'Place one active project on workbench', 'Take final wide photo'],
      done_when: 'Workspace is usable and project-ready.',
      leverage_score: 8,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'low',
      risk: 'Leaving trash bag in place.'
    })
  ];
  return {
    detected_work_type: 'custom',
    interpreted_goal: 'Create one usable garage work area today without redesigning the whole garage.',
    plan_title: 'Workspace organization sprint',
    plan_summary: 'Clear one zone, create storage logic, stage active project area.',
    assumptions: ['You want a functional weekend project workspace, not full-garage redesign.'],
    clarifying_questions: [],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    next_move: {
      direct_answer: 'Clear one workbench first.',
      next_move: 'Clear one workbench zone.',
      go_here: 'Garage workbench',
      write_make_do: 'Take before photo and remove non-project items from one workbench.',
      proof_needed: 'Before/after workbench photo.',
      avoid: 'Do not attempt the entire garage in one pass.',
      suggested_action: 'start_focus',
      next_action: 'Clear the first zone now.',
      suggested_focus_minutes: 15,
      priority_reason: 'One usable zone unlocks all project work.',
      drift_warning: ''
    }
  };
}

function buildSocialGrowthPlan(raw: string): Omit<PlanBuilderOutput, 'next_move'> & { next_move: DailyNextMoveResponse } {
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Clarify account promise',
      objective: 'Make profile intent obvious in one sentence.',
      why_it_matters: 'Followers convert better when profile value is clear.',
      category: 'other',
      priority: 1,
      status: 'planned',
      estimated_minutes: 20,
      actual_minutes: 0,
      proof_required: 'Profile bio screenshot or note with one-sentence promise.',
      proof_provided: '',
      first_action: 'Write one sentence: "I post about ___ for ___."',
      checklist: ['Draft one sentence', 'Update bio headline', 'Set profile link'],
      done_when: 'Account promise is visible on profile.',
      leverage_score: 8,
      money_potential: 'medium',
      urgency: 'high',
      effort: 'low',
      risk: 'Vague positioning.'
    }),
    outcomeBase({
      title: 'Publish 3 useful posts',
      objective: 'Create visible proof of value.',
      why_it_matters: 'Posting consistency is required for growth.',
      category: 'other',
      priority: 2,
      status: 'planned',
      estimated_minutes: 50,
      actual_minutes: 0,
      proof_required: 'Screenshots or links to 3 published posts.',
      proof_provided: '',
      first_action: 'Draft 3 posts: one build update, one lesson, one question.',
      checklist: ['Draft post 1', 'Draft post 2', 'Draft post 3', 'Publish all three'],
      done_when: '3 posts are live.',
      leverage_score: 9,
      money_potential: 'medium',
      urgency: 'high',
      effort: 'medium',
      risk: 'Editing loops delay publishing.'
    }),
    outcomeBase({
      title: 'Engage with 20 relevant accounts',
      objective: 'Create meaningful interactions that lead to followers.',
      why_it_matters: 'Engagement drives discovery.',
      category: 'other',
      priority: 3,
      status: 'planned',
      estimated_minutes: 35,
      actual_minutes: 0,
      proof_required: 'Screenshot/tracker of 20 thoughtful replies.',
      proof_provided: '',
      first_action: 'Search 3 niche keywords and reply thoughtfully to 20 posts.',
      checklist: ['Pick 3 keywords', 'Reply to 20 posts', 'Track replies in simple sheet'],
      done_when: '20 relevant interactions completed.',
      leverage_score: 8,
      money_potential: 'medium',
      urgency: 'medium',
      effort: 'medium',
      risk: 'Low-quality one-word replies.'
    })
  ];
  return {
    detected_work_type: 'sales_day',
    interpreted_goal: 'Grow account with profile clarity, consistent posting, and targeted engagement.',
    plan_title: 'Social growth sprint',
    plan_summary: 'Promise -> posts -> engagement loop with proof.',
    assumptions: ['Goal is follower growth through organic actions.'],
    clarifying_questions: [],
    daily_outcomes: outcomes,
    today_missions: outcomes.map(toMission),
    message_templates: [
      { id: 'sg1', label: 'Post starter', body: 'Build update: [what I changed], [why it matters], [question].' },
      { id: 'sg2', label: 'Reply template', body: 'Great point on [topic]. I found [insight]. Curious how you handle [specific question]?' }
    ],
    next_move: {
      direct_answer: 'Set account promise first.',
      next_move: 'Write profile promise.',
      go_here: 'X profile editor',
      write_make_do: 'Write: "I post about ___ for ___." and update profile now.',
      proof_needed: 'Bio screenshot.',
      avoid: 'Posting before positioning is clear.',
      suggested_action: 'start_focus',
      next_action: 'Update profile promise now.',
      suggested_focus_minutes: 10,
      priority_reason: 'Promise clarity improves all post performance.',
      drift_warning: ''
    }
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
  const expanded = expandVagueGoal(raw);
  const outcomes: DailyOutcome[] = [
    outcomeBase({
      title: 'Define today\'s target artifact',
      why_it_matters: 'Execution beats intent.',
      category: cat,
      priority: 1,
      status: 'planned',
      estimated_minutes: 60,
      actual_minutes: 0,
      proof_required: 'Timestamped artifact (screenshot, export, or message) proving completion.',
      proof_provided: '',
      first_action: `Assumption: ${expanded.assumption} Open your main tool and create the first concrete artifact now.`,
      value_score: 7,
      quality_score: 7,
      leverage_score: 7,
      money_potential: 'low',
      urgency: 'medium',
      effort: 'medium'
    }),
    outcomeBase({
      title: 'Ship the first proof-backed result',
      why_it_matters: 'Backup keeps momentum if first finishes early.',
      category: cat,
      priority: 2,
      status: 'planned',
      estimated_minutes: 45,
      actual_minutes: 0,
      proof_required: 'Artifact or log entry.',
      proof_provided: '',
      first_action: 'Run the first action now and capture one visible proof artifact.',
      value_score: 6,
      quality_score: 6,
      leverage_score: 5,
      money_potential: 'low',
      urgency: 'low',
      effort: 'medium'
    })
  ];

  const next_move: DailyNextMoveResponse = {
    direct_answer: 'Start the first inferred action and capture proof.',
    next_move: 'Start first execution block.',
    go_here: 'Notes',
    write_make_do: 'Create one real artifact tied to your interpreted goal.',
    proof_needed: 'Screenshot of first concrete artifact.',
    avoid: 'Planning loops without output.',
    suggested_action: 'start_focus',
    next_action: 'Execute the first task now.',
    suggested_focus_minutes: 10,
    priority_reason: 'Clarity reduces rework.',
    drift_warning: ''
  };

  return {
    detected_work_type: work,
    interpreted_goal: expanded.interpreted_goal,
    plan_title: "Today's plan",
    plan_summary: raw.trim() ? `TaskPilot interpreted: ${raw.slice(0, 200)}` : 'TaskPilot inferred a practical execution plan.',
    assumptions: [expanded.assumption, 'You can edit missions after this first useful draft.'],
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
  const intentDetection = detectGoalIntent(raw, input.detected_work_type_override || input.category || '');
  const expanded = expandVagueGoal(raw, input.context);
  const detectedWork = mapIntentToWorkType(intentDetection.intent);
  const selectedWork = input.detected_work_type_override || null;
  const work =
    input.apply_selected_category_anyway && selectedWork
      ? selectedWork
      : detectedWork;
  const entities = extractEntities(raw);
  const _template = choosePlanTemplate(work);

  let partial: Omit<PlanBuilderOutput, 'playbook'> & { next_move: DailyNextMoveResponse };

  switch (work) {
    case 'service_business_sales':
      partial = intentDetection.intent === 'social_growth' ? buildSocialGrowthPlan(raw) : buildServiceBusinessSalesPlan(raw);
      break;
    case 'service_day':
      partial = buildServicePlan(raw, input.time_horizon);
      break;
    case 'hardware_setup':
      partial = buildHardwarePlan(raw);
      if (intentDetection.intent === 'electronics_project') {
        partial.plan_title = 'Electronics prototype sprint';
        partial.plan_summary = 'Architecture -> parts/wiring -> firmware -> display proof.';
      }
      break;
    case 'sales_day':
      partial = buildSalesPlan(raw);
      break;
    case 'app_build':
      partial = buildAppBuildPlan(raw);
      break;
    case 'custom':
      if (intentDetection.intent === 'workspace_organization') partial = buildWorkspaceOrganizationPlan(raw);
      else partial = buildGenericPlan(raw, 'custom');
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
      if (intentDetection.intent === 'workspace_organization') partial = buildWorkspaceOrganizationPlan(raw);
      else if (intentDetection.intent === 'social_growth') partial = buildSocialGrowthPlan(raw);
      else partial = buildGenericPlan(raw, 'custom');
  }

  partial.detected_work_type = work;
  partial.detected_intent = intentDetection.intent;
  partial.intent_conflict = intentDetection.category_conflict;
  if (intentDetection.category_conflict) {
    const msg = `TaskPilot detected that your goal fits ${intentDetection.intent.replace(/_/g, ' ')} better than ${workTypeLabel(selectedWork || detectedWork)}.`;
    partial.conflict_reason = msg;
    partial.assumptions = [msg, ...(partial.assumptions || [])].slice(0, 4);
  }
  if (intentDetection.missing_info.length) {
    partial.clarifying_questions = [
      intentDetection.missing_info[0],
      'Do you mean grow followers, get sales, or finish a project?'
    ];
    partial.sections = [
      ...(partial.sections || []),
      {
        id: 'need_one_detail',
        title: 'Need one detail',
        items: ['Grow followers', 'Get sales', 'Finish a project']
      }
    ];
  }
  if (!partial.interpreted_goal) partial.interpreted_goal = expanded.interpreted_goal;
  if (partial.assumptions && expanded.assumption && !partial.assumptions.some((a) => a.toLowerCase().includes(expanded.assumption.toLowerCase()))) {
    partial.assumptions = [expanded.assumption, ...partial.assumptions].slice(0, 4);
  }
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

/** Dev-only sanity prompts for planner regression checks */
export const PLANNER_REGRESSION_TESTS = [
  'Organize a messy garage into a functional weekend project workspace.',
  'grow X account to 20 followers',
  'find new leads for details',
  'get more customers for my detailing business',
  'successful 3 car detail day tomorrow',
  'build a high level electronics project',
  'fix my atom robot screen',
  'set up my lotto bitcoin miner',
  'ship one improvement to my SaaS app',
  'make money today',
  'clean up unpaid invoices'
] as const;

export { WORK_TYPE_LABELS };
