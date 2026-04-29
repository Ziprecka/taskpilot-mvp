import type { DailyOutcome } from '@/types/workflow';

export type CopilotMode = 'action' | 'draft' | 'blocked' | 'brainstorm';

export type CopilotMissionType =
  | 'workspace_organization'
  | 'social_growth'
  | 'electronics_project'
  | 'outreach'
  | 'lead_generation'
  | 'service_day'
  | 'customer_followup'
  | 'review_request'
  | 'unpaid_invoice'
  | 'app_build'
  | 'hardware_debug'
  | 'research'
  | 'admin'
  | 'personal';

export type CopilotExecutionOutput = {
  mode: CopilotMode;
  title: string;
  immediate_action: string;
  where_to_go?: string[];
  make_this?: string;
  template?: string;
  checklist?: string[];
  proof_required: string;
  next_after_proof: string;
  copyable_artifacts?: Array<{ label: string; content: string }>;
  source?: 'current_mission' | 'brainstorm' | 'artifact_template' | 'repaired_stale_output' | 'blocked_helper';
};

export type UserExecutionContext = {
  user_id?: string;
  email?: string;
  role?: string;
  industry?: string;
  business_name?: string;
  service_area?: string;
  offer?: string;
  target_customer?: string;
  preferred_tone?: string;
  common_tools?: string[];
  private_examples?: string[];
  booking_link?: string;
};

type ResolvedContext = Required<Pick<UserExecutionContext, 'booking_link'>> & UserExecutionContext;

export type CopilotGeneratedState = {
  mission_id: string | null;
  mode: CopilotMode;
  generated_at: string;
  output: CopilotExecutionOutput;
};

const GENERIC_BANNED = [
  'use the template',
  'complete the task',
  'do the step',
  'make progress',
  'start with the first action',
  'follow the checklist',
  'log proof'
];

function isSamUser(email?: string): boolean {
  return String(email || '').toLowerCase() === 'sladoski64@gmail.com';
}

function mergedUserContext(ctx?: UserExecutionContext): ResolvedContext {
  return {
    ...(ctx || {}),
    booking_link: ctx?.booking_link || '[booking link]'
  };
}

function shouldUseSamPrivateContext(ctx: ResolvedContext, missionType: CopilotMissionType, dailyGoalContext?: string): boolean {
  if (!isSamUser(ctx.email)) return false;
  const blob = `${dailyGoalContext || ''} ${missionType}`.toLowerCase();
  return /\b(detail|detailing|service|leads?|outreach|customers?)\b/.test(blob);
}

function applyUserScopedDefaults(ctx: ResolvedContext, missionType: CopilotMissionType, dailyGoalContext?: string): ResolvedContext {
  if (ctx.business_name || ctx.offer || ctx.service_area) return ctx;
  if (!shouldUseSamPrivateContext(ctx, missionType, dailyGoalContext)) return ctx;
  return {
    ...ctx,
    business_name: 'Suds Auto Salon',
    industry: 'mobile auto detailing',
    service_area: 'Seattle / North Seattle / Snohomish County',
    offer: 'mobile auto detailing',
    target_customer:
      'car owners, busy professionals, families, high-income vehicle owners, local vehicle-based businesses',
    preferred_tone: 'direct, premium, helpful'
  };
}

export function getCopilotMissionType(
  mission: DailyOutcome | null,
  dailyGoalContext?: string,
  detectedWorkType?: string
): CopilotMissionType {
  const text = `${mission?.title || ''} ${mission?.objective || mission?.why_it_matters || ''} ${
    mission?.first_action || ''
  } ${mission?.proof_required || ''} ${mission?.category || ''} ${dailyGoalContext || ''} ${detectedWorkType || ''}`.toLowerCase();

  if (/\b(unpaid invoice|past due|overdue invoice|collect payment|invoice reminder)\b/.test(text)) return 'unpaid_invoice';
  if (/\b(garage|workspace|workbench|sort tools|organization)\b/.test(text)) return 'workspace_organization';
  if (/\b(followers|x account|post thread|engage accounts?)\b/.test(text)) return 'social_growth';
  if (/\b(sensor|breadboard|wiring plan|display sensor|electronics)\b/.test(text)) return 'electronics_project';
  if (/\b(review request|google review|yelp review)\b/.test(text)) return 'review_request';
  if (/\b(follow up|follow-up|booking path|quote handoff|reply template)\b/.test(text)) return 'customer_followup';
  if (/\b(outreach|dm|cold email|send 5|send messages?)\b/.test(text)) return 'outreach';
  if (/\b(lead|prospect|customers?|bookings?|yelp|instagram|facebook groups?)\b/.test(text)) return 'lead_generation';
  if (/\b(detail|detailing|service day|before\/after|route|van)\b/.test(text)) return 'service_day';
  if (/\b(app|deploy|component|feature|bug|qa|commit|next\.?js|react)\b/.test(text)) return 'app_build';
  if (/\b(atom|arduino|esp32|firmware|serial|robot)\b/.test(text)) return 'hardware_debug';
  if (/\b(research|compare|sources)\b/.test(text)) return 'research';
  if (/\b(admin|inbox|calendar|ops|cleanup)\b/.test(text)) return 'admin';
  return 'personal';
}

export const copilotArtifactTemplates: Partial<Record<CopilotMissionType, Array<{ label: string; content: string }>>> = {
  outreach: [],
  service_day: [
    { label: 'Customer confirmation', content: "You're confirmed for today. I'll send an ETA before arrival." },
    { label: 'On-my-way text', content: 'On my way now. ETA [time]. Reply with any gate/parking notes.' },
    { label: 'Completion text', content: 'Detail complete. Photos attached. Want me to send a maintenance plan for next month?' },
    { label: 'Review ask', content: 'If you loved the result, would you leave a quick review here: [review link]' },
    { label: 'Maintenance offer', content: 'Want me to lock your next maintenance detail in 4-6 weeks?' }
  ],
  customer_followup: [
    { label: 'Interested lead reply', content: 'Great — based on your vehicle, I can send a quick quote and available slots today.' },
    { label: 'No-response follow-up', content: 'Quick follow-up in case this got buried. Want pricing + available slots this week?' },
    { label: 'Booking CTA', content: 'If this works, pick your slot here: [booking link]. I will confirm right away.' }
  ],
  review_request: [
    { label: 'Review request', content: 'Thanks again for trusting us. If everything looked great, could you leave a quick review: [review link]' },
    { label: 'Review follow-up', content: 'Friendly nudge on the review link in case you missed it: [review link]. Thank you.' },
    { label: 'Thank-you reply', content: 'Thank you for the review — really appreciate it. Happy to help next time.' }
  ],
  unpaid_invoice: [
    { label: 'Polite reminder', content: 'Quick reminder: invoice #[id] for [amount] was due [date]. Please send payment at your earliest convenience.' },
    { label: 'Firm reminder', content: 'Following up on invoice #[id], now [x] days overdue. Please confirm payment date today.' },
    { label: 'Final notice', content: 'Final notice for invoice #[id]. If unpaid by [date], service will pause until balance is cleared.' }
  ],
  app_build: [
    { label: 'Implementation checklist', content: '- Confirm scope\n- Edit minimal files\n- Verify behavior\n- Capture screenshot proof' },
    { label: 'Test commands', content: 'npm run build\nnpm run dev' },
    { label: 'Commit message', content: 'feat: ship scoped improvement with proof-backed QA' },
    { label: 'QA checklist', content: '- Happy path\n- Edge case\n- Mobile check\n- No console errors' }
  ],
  hardware_debug: [
    { label: 'Command checklist', content: '- Confirm device port\n- Flash test firmware\n- Run heartbeat route check' },
    { label: 'Serial checklist', content: '- Port visible\n- Stable output every 5-10s\n- No disconnect spam' },
    { label: 'Debug path', content: 'Cable -> Port -> Driver -> Flash -> Serial -> API check -> Log proof' }
  ],
  admin: [
    { label: 'Execution checklist', content: '- Clear top 3 overdue items\n- Calendar block tomorrow\n- Save one reusable template' }
  ]
};

function outreachArtifacts(ctx: ResolvedContext) {
  const brand = ctx.business_name || 'my service';
  const offer = ctx.offer || 'mobile service';
  const area = ctx.service_area ? ` in ${ctx.service_area}` : '';
  const opener = `Hey [name] — I run ${brand}, a ${offer}${area}. Your [vehicle/business/page] caught my eye, and I have a few slots this week. Want a quick quote?`;
  const softer = `Hi [name], quick hello from ${brand}. If you ever want ${offer} without extra hassle, I can send a simple quote and availability.`;
  const followup = `Just checking back — I still have a couple ${offer} openings this week. Want me to send pricing + times?`;
  const booking = `If you want to lock it in, book here: ${ctx.booking_link}`;
  return [
    { label: 'DM opener', content: opener },
    { label: 'Softer DM', content: softer },
    { label: 'Follow-up', content: followup },
    { label: 'Tracker columns', content: 'Name | Platform | Contact | Vehicle/business | Fit reason | Message sent | Reply | Follow-up date | Notes' },
    { label: 'Booking CTA', content: booking }
  ];
}

function buildByType(
  type: CopilotMissionType,
  mode: CopilotMode,
  mission: DailyOutcome | null,
  ctx: ResolvedContext
): CopilotExecutionOutput {
  const proof = mission?.proof_required || 'Screenshot of completed action and tracker update.';

  if (mode === 'brainstorm') {
    return {
      mode,
      title: "Let's turn this into a useful mission.",
      immediate_action: 'Choose one path below and start the first concrete action.',
      where_to_go: ['Current mission card', 'Main execution tool for selected path'],
      make_this:
        'Best interpretation: You need one practical path with clear proof.\nPaths: 1) Build list/scope 2) Execute outreach/work block 3) Follow up/close loop\nRecommended: Path 1 then Path 2.',
      checklist: [
        'Pick one path only',
        'Write the first action in one sentence',
        'Run for 10-15 minutes',
        'Capture one visible proof'
      ],
      proof_required: proof,
      next_after_proof: 'Use this path and sharpen mission title/first action if needed.',
      copyable_artifacts: [{ label: 'Use this path', content: 'Recommended path: Build list/scope -> execute -> follow-up. First action: start with 10 concrete items.' }],
      source: 'brainstorm'
    };
  }

  if (type === 'outreach' || type === 'lead_generation') {
    if (mode === 'action') {
      return {
        mode,
        title: 'Send targeted outreach messages',
        immediate_action:
          'Open Instagram and search local car hashtags, pick 5 accounts with visible vehicles, and send the DM template below.',
        where_to_go: [
          'Instagram local car hashtags and local profiles',
          'Google Maps: apartments, gyms, barbershops, realtors, dealerships, auto shops',
          'Yelp quote requests and local Facebook groups'
        ],
        make_this:
          'Tracker columns: Name | Platform | Contact | Vehicle/business | Fit reason | Message sent | Reply | Follow-up date | Notes',
        template: outreachArtifacts(ctx)[0].content,
        checklist: [
          'Pick 5 reasonable prospects quickly (no perfection loop)',
          'Personalize first line with location, vehicle, or recent post',
          'Send all 5 messages and mark rows as sent',
          'Set follow-up date for each'
        ],
        proof_required: proof,
        next_after_proof: 'Log proof, then send follow-up to any non-replies in 24-48 hours.',
        copyable_artifacts: outreachArtifacts(ctx),
        source: 'artifact_template'
      };
    }
    if (mode === 'blocked') {
      return {
        mode,
        title: 'Unblock outreach in 2 minutes',
        immediate_action: 'Stop searching for perfect leads. Send one message to the first reasonable profile now.',
        where_to_go: ['Instagram search or Google Maps result list already open'],
        make_this: 'Use one message version only and move fast.',
        template: outreachArtifacts(ctx)[1].content,
        checklist: [
          'Send 1 message in 2 minutes',
          'Repeat for next 4 reasonable profiles',
          'Skip deep research and custom scripting',
          'Capture sent screenshots as proof'
        ],
        proof_required: 'Screenshot of 1 sent message (then 5 total).',
        next_after_proof: 'After 5 sends, switch to follow-up scheduling.',
        copyable_artifacts: [
          { label: '2-minute unblock rule', content: 'First 5 reasonable leads > waiting for perfect leads.' },
          ...outreachArtifacts(ctx).slice(1, 3)
        ],
        source: 'blocked_helper'
      };
    }
    return {
      mode,
      title: 'Outreach asset pack',
      immediate_action: 'Copy a message version and send to 5 prospects now.',
      where_to_go: ['Instagram + Google Maps + Yelp/Facebook groups'],
      make_this: 'Use the tracker and message variants below.',
      template: outreachArtifacts(ctx)[0].content,
      checklist: ['Send 5 messages', 'Mark tracker rows', 'Set follow-up dates'],
      proof_required: proof,
      next_after_proof: 'Log proof and run follow-up sequence.',
      copyable_artifacts: outreachArtifacts(ctx),
      source: 'artifact_template'
    };
  }

  if (type === 'workspace_organization') {
    return {
      mode,
      title: 'Create one usable workspace zone',
      immediate_action: 'Pick one workbench zone and clear it fully before touching anything else.',
      where_to_go: ['Garage/workbench area'],
      make_this: 'Zone labels: Tools | Supplies | Active Projects',
      checklist: ['Take before photo', 'Clear one workbench', 'Create 3 zones', 'Remove one trash bag', 'Take after photo'],
      proof_required: mission?.proof_required || 'Before/after workspace photos.',
      next_after_proof: 'Stage one active weekend project on the cleared bench.',
      copyable_artifacts: [
        { label: 'Sort labels', content: 'Zone 1: Tools\nZone 2: Supplies/Materials\nZone 3: Active Projects' },
        { label: 'Throw-away-first list', content: 'Empty boxes, broken items, random packaging, duplicate junk hardware.' }
      ],
      source: mode === 'blocked' ? 'blocked_helper' : 'artifact_template'
    };
  }

  if (type === 'social_growth') {
    return {
      mode,
      title: 'Ship social growth loop',
      immediate_action: 'Draft and publish 3 posts: build update, lesson, and question.',
      where_to_go: ['X compose', 'Niche keyword search'],
      make_this: 'Post templates + engagement tracker',
      checklist: ['Publish 3 posts', 'Reply to 20 niche posts', 'Track interactions'],
      proof_required: mission?.proof_required || 'Post links/screenshots + engagement tracker screenshot.',
      next_after_proof: 'Follow up with high-quality replies and profile optimization.',
      copyable_artifacts: [
        { label: 'Post starter', content: 'Build update: [what changed], [what I learned], [question for audience].' },
        { label: 'Reply template', content: 'Great point on [topic]. I found [insight]. Curious how you handle [specific issue]?' }
      ],
      source: 'artifact_template'
    };
  }

  if (type === 'electronics_project') {
    return {
      mode,
      title: 'Scope electronics prototype',
      immediate_action: 'Pick one board, one sensor, and one display to validate first.',
      where_to_go: ['Parts list', 'Wiring sketch', 'Firmware editor'],
      make_this: 'Parts checklist + wiring map + serial test plan',
      checklist: ['Confirm parts', 'Sketch wiring', 'Flash minimal firmware', 'Verify serial output', 'Show sensor reading on display'],
      proof_required: mission?.proof_required || 'Parts/wiring photo + serial output screenshot + display demo photo.',
      next_after_proof: 'Document failures and next debug step.',
      copyable_artifacts: [
        { label: 'Parts checklist', content: 'Board | Sensor | Display | Jumper wires | Power source' },
        { label: 'Serial debug checklist', content: 'Port detected -> firmware flashed -> stable serial values -> display refresh confirmed' }
      ],
      source: 'artifact_template'
    };
  }

  if (type === 'app_build') {
    return {
      mode,
      title: 'Build the acceptance checklist',
      immediate_action: 'Open Cursor and identify the route/component that controls the visible change.',
      where_to_go: ['Cursor project search', 'Target route/component file'],
      make_this:
        'Acceptance checklist:\n- route/file identified\n- one UI change scoped\n- before screenshot captured\n- after screenshot captured\n- build passes',
      checklist: [
        'Name exact file path',
        'Implement smallest visible diff',
        'Capture before/after screenshots',
        'Run npm run build'
      ],
      proof_required: mission?.proof_required || 'Before/after screenshot + commit hash.',
      next_after_proof: 'Make the smallest visible change and run build.',
      copyable_artifacts: copilotArtifactTemplates.app_build,
      source: mode === 'blocked' ? 'blocked_helper' : 'artifact_template'
    };
  }

  const baseArtifacts =
    type === 'service_day'
      ? copilotArtifactTemplates.service_day || []
      : type === 'review_request'
        ? copilotArtifactTemplates.review_request || []
        : type === 'customer_followup'
          ? copilotArtifactTemplates.customer_followup || []
          : type === 'unpaid_invoice'
            ? copilotArtifactTemplates.unpaid_invoice || []
            : type === 'hardware_debug'
                ? copilotArtifactTemplates.hardware_debug || []
                : copilotArtifactTemplates.admin || [];

  const actionLine =
    mode === 'blocked'
      ? 'Shrink this to a 2-minute action and capture a small proof.'
      : mission?.first_action || 'Execute the first concrete action now.';

  return {
    mode,
    title: mission?.title || 'Execution assistant',
    immediate_action: actionLine,
    where_to_go: ['Current mission panel', 'Main execution tool'],
    make_this: baseArtifacts[0]?.content || 'Create one concrete artifact.',
    template: baseArtifacts[0]?.content,
    checklist: mission?.checklist?.slice(0, 4) || ['Run first action', 'Capture proof', 'Update status'],
    proof_required: proof,
    next_after_proof: 'Log proof and move to the next highest-leverage action.',
    copyable_artifacts: baseArtifacts,
    source: mode === 'blocked' ? 'blocked_helper' : 'current_mission'
  };
}

function isGeneric(output: CopilotExecutionOutput): boolean {
  const combined = `${output.immediate_action} ${output.make_this || ''} ${output.template || ''}`.toLowerCase();
  const hasBanned = GENERIC_BANNED.some((p) => combined.includes(p));
  const tooShort = combined.trim().length < 80;
  return hasBanned || tooShort;
}

function dedupeArtifacts(artifacts?: Array<{ label: string; content: string }>) {
  if (!artifacts?.length) return [];
  const seen = new Set<string>();
  const out: Array<{ label: string; content: string }> = [];
  for (const item of artifacts) {
    const key = `${item.label.trim().toLowerCase()}|${item.content.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function dedupeCopilotSections(output: CopilotExecutionOutput): CopilotExecutionOutput {
  const cleaned = { ...output };
  cleaned.copyable_artifacts = dedupeArtifacts(cleaned.copyable_artifacts);
  if (cleaned.template && cleaned.make_this && cleaned.template.trim().toLowerCase() === cleaned.make_this.trim().toLowerCase()) {
    cleaned.template = undefined;
  }
  return cleaned;
}

function isVagueMission(mission: DailyOutcome | null, detectedWorkType?: string): boolean {
  if (!mission) return true;
  const text = `${mission.title} ${mission.first_action} ${mission.proof_required}`.toLowerCase();
  const genericWords = /(make money|grow business|work on app|find leads|fix workflow|get organized|make progress)/i;
  const genericFirstAction = /(start|do|work on|make progress|use template)/i.test(String(mission.first_action || ''));
  const genericProof = /(log proof|proof item|visible progress)/i.test(String(mission.proof_required || ''));
  return genericWords.test(text) || genericFirstAction || genericProof || detectedWorkType === 'custom';
}

function hasWrongArtifactForMission(missionType: CopilotMissionType, output: CopilotExecutionOutput): boolean {
  const blob = `${output.make_this || ''} ${output.template || ''} ${output.copyable_artifacts?.map((a) => a.label).join(' ') || ''}`.toLowerCase();
  if (missionType === 'app_build' || missionType === 'hardware_debug' || missionType === 'admin') {
    return /customer confirmation|review ask|maintenance offer/.test(blob);
  }
  return false;
}

function hasSudsLeak(output: CopilotExecutionOutput, ctx: ResolvedContext): boolean {
  if (isSamUser(ctx.email)) return false;
  const blob = `${output.title} ${output.immediate_action} ${output.make_this || ''} ${output.template || ''} ${
    output.copyable_artifacts?.map((a) => a.content).join(' ') || ''
  }`.toLowerCase();
  return /suds auto salon|north seattle|snohomish|sam/.test(blob);
}

function qualityRepair(
  missionType: CopilotMissionType,
  mode: CopilotMode,
  mission: DailyOutcome | null,
  ctx: ResolvedContext
): CopilotExecutionOutput {
  const repaired = buildByType(missionType, mode === 'brainstorm' ? 'action' : mode, mission, ctx);
  return { ...repaired, source: 'repaired_stale_output' };
}

export function getDefaultCopilotMode(args: {
  mission: DailyOutcome | null;
  detectedWorkType?: string;
  blocked?: boolean;
}): CopilotMode {
  if (args.blocked || args.mission?.status === 'blocked') return 'blocked';
  if (isVagueMission(args.mission, args.detectedWorkType)) return 'brainstorm';
  const type = getCopilotMissionType(args.mission, '', args.detectedWorkType);
  if (type === 'outreach' || type === 'lead_generation' || type === 'customer_followup' || type === 'review_request') return 'draft';
  return 'action';
}

export function buildCopilotExecutionOutput(args: {
  mode: CopilotMode;
  mission: DailyOutcome | null;
  dailyGoalContext?: string;
  detectedWorkType?: string;
  userContext?: UserExecutionContext;
}): CopilotExecutionOutput {
  const missionType = getCopilotMissionType(args.mission, args.dailyGoalContext, args.detectedWorkType);
  const context = applyUserScopedDefaults(mergedUserContext(args.userContext), missionType, args.dailyGoalContext);
  const effectiveMode = isVagueMission(args.mission, args.detectedWorkType) && args.mode === 'action' ? 'brainstorm' : args.mode;
  const first = dedupeCopilotSections(buildByType(missionType, effectiveMode, args.mission, context));
  const invalid =
    isGeneric(first) ||
    hasWrongArtifactForMission(missionType, first) ||
    hasSudsLeak(first, context) ||
    !String(first.proof_required || '').trim() ||
    !String(first.immediate_action || '').trim();
  if (!invalid) return first;
  return dedupeCopilotSections(qualityRepair(missionType, effectiveMode, args.mission, context));
}

/** Dev regression checks for Copilot mission execution quality */
export const COPILOT_REGRESSION_CASES = [
  {
    mission: 'Send 5 targeted outreach messages',
    objective: 'Start real sales conversations instead of only collecting names.',
    first_action: 'Use the outreach template and send 5 personalized messages.',
    proof_required: 'Screenshots of sent messages or tracker rows marked sent.'
  }
] as const;
