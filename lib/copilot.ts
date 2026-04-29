import type { DailyOutcome } from '@/types/workflow';

export type CopilotMode = 'action' | 'draft' | 'blocked';

export type CopilotMissionType =
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
};

export type CopilotBusinessContext = {
  business_name?: string;
  service_area?: string;
  offer?: string;
  target_customer?: string;
  booking_link?: string;
  tone?: string;
};

export const DEFAULT_COPILOT_BUSINESS_CONTEXT: Required<CopilotBusinessContext> = {
  business_name: 'Suds Auto Salon',
  service_area: 'Seattle / North Seattle / Snohomish County area',
  offer: 'mobile auto detailing',
  target_customer: 'car owners, busy professionals, families, high-income vehicle owners, small businesses with vehicles',
  booking_link: '[booking link]',
  tone: 'direct, premium, helpful'
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

function mergedBusinessContext(ctx?: CopilotBusinessContext): Required<CopilotBusinessContext> {
  return { ...DEFAULT_COPILOT_BUSINESS_CONTEXT, ...(ctx || {}) };
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

export const copilotArtifactTemplates: Record<
  Exclude<CopilotMissionType, 'lead_generation' | 'personal' | 'research'>,
  Array<{ label: string; content: string }>
> = {
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

function outreachArtifacts(ctx: Required<CopilotBusinessContext>) {
  const opener = `Hey [name] — I run ${ctx.business_name}, a ${ctx.offer} service in ${ctx.service_area}. Your [vehicle/business/page] caught my eye, and I have a few slots this week. Want a quick quote?`;
  const softer = `Hi [name], quick hello from ${ctx.business_name}. If you ever want ${ctx.offer} without driving anywhere, I can send a simple quote and availability.`;
  const followup = `Just checking back — I still have a couple ${ctx.offer} openings this week. Want me to send pricing + times?`;
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
  ctx: Required<CopilotBusinessContext>
): CopilotExecutionOutput {
  const proof = mission?.proof_required || 'Screenshot of completed action and tracker update.';

  if (type === 'outreach' || type === 'lead_generation') {
    if (mode === 'action') {
      return {
        mode,
        title: 'Send 5 targeted outreach messages',
        immediate_action:
          'Open Instagram and search "Seattle cars" or "Seattle WRX", pick 5 accounts with visible vehicles, and send the DM template below.',
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
        copyable_artifacts: outreachArtifacts(ctx)
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
        ]
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
      copyable_artifacts: outreachArtifacts(ctx)
    };
  }

  const baseArtifacts =
    type === 'service_day'
      ? copilotArtifactTemplates.service_day
      : type === 'review_request'
        ? copilotArtifactTemplates.review_request
        : type === 'customer_followup'
          ? copilotArtifactTemplates.customer_followup
          : type === 'unpaid_invoice'
            ? copilotArtifactTemplates.unpaid_invoice
            : type === 'app_build'
              ? copilotArtifactTemplates.app_build
              : type === 'hardware_debug'
                ? copilotArtifactTemplates.hardware_debug
                : copilotArtifactTemplates.admin;

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
    copyable_artifacts: baseArtifacts
  };
}

function isGeneric(output: CopilotExecutionOutput): boolean {
  const combined = `${output.immediate_action} ${output.make_this || ''} ${output.template || ''}`.toLowerCase();
  const hasBanned = GENERIC_BANNED.some((p) => combined.includes(p));
  const tooShort = combined.trim().length < 80;
  return hasBanned || tooShort;
}

export function buildCopilotExecutionOutput(args: {
  mode: CopilotMode;
  mission: DailyOutcome | null;
  dailyGoalContext?: string;
  detectedWorkType?: string;
  businessContext?: CopilotBusinessContext;
}): CopilotExecutionOutput {
  const context = mergedBusinessContext(args.businessContext);
  const missionType = getCopilotMissionType(args.mission, args.dailyGoalContext, args.detectedWorkType);
  const first = buildByType(missionType, args.mode, args.mission, context);
  if (!isGeneric(first) && !(missionType === 'outreach' || missionType === 'lead_generation')) return first;
  if ((missionType === 'outreach' || missionType === 'lead_generation') && first.copyable_artifacts?.some((a) => /hey \[name\]/i.test(a.content))) {
    return first;
  }
  return buildByType('outreach', args.mode === 'blocked' ? 'blocked' : 'draft', args.mission, context);
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
