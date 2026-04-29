import type { PlanBuilderOutput } from '@/types/planBuilder';
import type { DailyOutcome } from '@/types/workflow';

type Payload = {
  raw_goal?: string;
  desired_outcome?: string;
  constraints?: string;
};

type Asset = { title: string; content: string };

function nowIso() {
  return new Date().toISOString();
}

function makeOutcome(input: {
  title: string;
  objective: string;
  first_action: string;
  checklist: string[];
  proof_required: string;
  done_when: string;
  estimated_minutes: number;
  category?: DailyOutcome['category'];
  leverage_score?: number;
  money_potential?: DailyOutcome['money_potential'];
}): DailyOutcome {
  const t = nowIso();
  return {
    id: crypto.randomUUID(),
    title: input.title,
    objective: input.objective,
    why_it_matters: input.objective,
    category: input.category || 'other',
    priority: 1,
    status: 'planned',
    estimated_minutes: input.estimated_minutes,
    actual_minutes: 0,
    proof_required: input.proof_required,
    proof_provided: '',
    first_action: input.first_action,
    checklist: input.checklist,
    done_when: input.done_when,
    risk: 'Scope drift or overthinking before proof.',
    leverage_score: input.leverage_score || 7,
    money_potential: input.money_potential || 'low',
    urgency: 'medium',
    effort: 'medium',
    created_at: t,
    updated_at: t,
    completed_at: null
  };
}

function toMission(outcome: DailyOutcome) {
  return {
    title: outcome.title,
    objective: outcome.objective || outcome.why_it_matters,
    first_action: outcome.first_action || '',
    checklist: outcome.checklist || [],
    proof_required: outcome.proof_required,
    estimated_minutes: outcome.estimated_minutes,
    risk: outcome.risk || '',
    done_when: outcome.done_when || '',
    category: outcome.category,
    leverage_score: outcome.leverage_score || 7,
    money_potential: outcome.money_potential === 'high' || outcome.money_potential === 'medium' ? outcome.money_potential : 'low'
  };
}

function appendAssetSections(plan: PlanBuilderOutput, assets: Asset[]) {
  if (!assets.length) return plan;
  const assetItems = assets.map((asset) => `${asset.title}: ${asset.content}`);
  const withoutOld = (plan.sections || []).filter((s) => s.id !== 'ready_assets');
  return {
    ...plan,
    sections: [
      ...withoutOld,
      {
        id: 'ready_assets',
        title: 'Ready-made assets',
        items: assetItems
      }
    ],
    copilot_seed: {
      next_action: plan.copilot_seed?.next_action || plan.next_move?.next_action || 'Start the first mission.',
      draft_assets: Array.from(new Set([...(plan.copilot_seed?.draft_assets || []), ...assetItems])).slice(0, 8),
      likely_blockers: plan.copilot_seed?.likely_blockers || ['Overthinking the perfect path', 'Skipping proof', 'Trying to build too much at once']
    }
  } satisfies PlanBuilderOutput;
}

function applyMissionSet(plan: PlanBuilderOutput, outcomes: DailyOutcome[], patch: Partial<PlanBuilderOutput>) {
  const prioritized = outcomes.map((outcome, idx) => ({ ...outcome, priority: Math.min(3, idx + 1) as 1 | 2 | 3 }));
  return {
    ...plan,
    ...patch,
    daily_outcomes: prioritized,
    today_missions: prioritized.map(toMission),
    next_move: {
      ...(plan.next_move || {}),
      direct_answer: prioritized[0]?.first_action || patch.next_move?.direct_answer || 'Start the first mission.',
      next_move: prioritized[0]?.title || patch.next_move?.next_move || 'Start first mission',
      go_here: 'Mission 1',
      write_make_do: prioritized[0]?.first_action || patch.next_move?.write_make_do || 'Start now.',
      proof_needed: prioritized[0]?.proof_required || patch.next_move?.proof_needed || 'Capture proof.',
      avoid: patch.next_move?.avoid || 'Do not drift into unrelated work before proof.',
      suggested_action: 'start_focus',
      next_action: prioritized[0]?.first_action || patch.next_move?.next_action || 'Start now.',
      suggested_focus_minutes: Math.min(25, prioritized[0]?.estimated_minutes || 15),
      priority_reason: patch.next_move?.priority_reason || 'The first mission creates the artifact that unlocks the rest of the plan.',
      drift_warning: ''
    }
  } satisfies PlanBuilderOutput;
}

function hasAny(text: string, terms: RegExp[]) {
  return terms.some((term) => term.test(text));
}

export function enhancePlanWithExecutionAssets(payload: Payload, plan: PlanBuilderOutput): PlanBuilderOutput {
  const raw = `${payload.raw_goal || ''} ${payload.desired_outcome || ''} ${payload.constraints || ''}`.toLowerCase();

  if (hasAny(raw, [/\b5k\b/, /charity run/, /run\/walk/, /beginner.*run/, /training days?/])) {
    const outcomes = [
      makeOutcome({
        title: 'Pick 3 weekly training days',
        objective: 'Lock a realistic training rhythm before building the schedule.',
        first_action: 'Open your calendar and choose 3 non-consecutive days for the next 4 weeks.',
        checklist: ['Choose 3 weekly days', 'Avoid back-to-back hard days', 'Add one optional easy walk day', 'Write the schedule start date'],
        proof_required: 'Screenshot or note showing the 3 chosen weekly training days.',
        done_when: 'Three weekly training days are selected and recorded.',
        estimated_minutes: 10,
        category: 'learning',
        leverage_score: 7
      }),
      makeOutcome({
        title: 'Use the 4-week run/walk schedule',
        objective: 'Create the actual beginner plan instead of just planning to plan.',
        first_action: 'Copy the 4-week schedule asset into notes or your tracker.',
        checklist: ['Copy Week 1 through Week 4', 'Mark 3 sessions per week', 'Keep all sessions beginner-friendly', 'Add event/easy day note'],
        proof_required: 'Written 4-week run/walk schedule saved in notes, doc, or tracker.',
        done_when: 'The full 4-week schedule is written and ready to follow.',
        estimated_minutes: 15,
        category: 'learning',
        leverage_score: 9
      }),
      makeOutcome({
        title: 'Complete the first 20-minute session',
        objective: 'Turn the plan into proof-backed action today.',
        first_action: 'Start the first 20-minute beginner session: warm-up walk, short jog/walk intervals, cooldown.',
        checklist: ['5 min warm-up walk', '10 rounds: 30 sec jog + 60 sec walk', '5 min cooldown walk', 'Record how it felt'],
        proof_required: 'Timer/app screenshot, photo, or note confirming the first session was completed.',
        done_when: 'The first 20-minute session is complete and proof is logged.',
        estimated_minutes: 25,
        category: 'learning',
        leverage_score: 10
      }),
      makeOutcome({
        title: 'Set up the training tracker',
        objective: 'Make the habit easy to repeat without a paid app.',
        first_action: 'Create a simple tracker with columns for date, session, completed, time, notes, and proof.',
        checklist: ['Create tracker table', 'Add the first session row', 'Add next session date', 'Keep notes short'],
        proof_required: 'Screenshot or note showing the tracker with the first session row.',
        done_when: 'Tracking method is ready and first row is logged.',
        estimated_minutes: 10,
        category: 'learning',
        leverage_score: 8
      })
    ];
    const assets = [
      {
        title: '4-week beginner run/walk schedule',
        content: 'Week 1: 3 days — 1 min jog / 2 min walk x 7 rounds. Week 2: 3 days — 90 sec jog / 2 min walk x 7 rounds. Week 3: 3 days — 2 min jog / 90 sec walk x 8 rounds. Week 4: 3 days — 3 min jog / 90 sec walk x 8 rounds; easy walk day before event.'
      },
      {
        title: 'First 20-minute session',
        content: '5 min warm-up walk → 10 rounds of 30 sec jog + 60 sec walk → 5 min cooldown walk.'
      },
      {
        title: 'Training tracker',
        content: 'Date | Session | Completed | Time | Notes | Proof'
      }
    ];
    return appendAssetSections(
      applyMissionSet(plan, outcomes, {
        detected_work_type: 'personal',
        plan_style: 'Fast win',
        interpreted_goal: 'Create and start a realistic 4-week beginner 5K run/walk plan.',
        plan_title: 'Beginner 5K training plan',
        plan_summary: 'Beginner-friendly 4-week run/walk plan with the first session and proof built in.',
        assumptions: ['Beginner-friendly plan; no gym or paid app required.', 'Proof can be a timer screenshot, note, or photo.'],
        proof_checklist: ['4-week schedule saved', 'First session completed', 'Tracker row created', 'Proof screenshot/note/photo logged']
      }),
      assets
    );
  }

  if (hasAny(raw, [/cold outreach/, /paid car detail/, /detail appointments?/, /sell .*appointments?/, /prospects?/, /messages? sent/])) {
    const outcomes = [
      makeOutcome({
        title: 'Choose one target customer type',
        objective: 'Avoid broad outreach by picking one buyer segment most likely to book.',
        first_action: 'Pick one segment: apartment residents, busy parents, realtors, car enthusiasts, or small businesses with vehicles.',
        checklist: ['Choose one segment', 'Write why they fit', 'List where to find them', 'Avoid building a full CRM'],
        proof_required: 'One-sentence target segment note or tracker screenshot.',
        done_when: 'One customer type is chosen and tied to a search source.',
        estimated_minutes: 10,
        category: 'money',
        leverage_score: 9,
        money_potential: 'high'
      }),
      makeOutcome({
        title: 'Build a 20-prospect tracker',
        objective: 'Create the smallest useful sales system without overbuilding a CRM.',
        first_action: 'Open a sheet or notes table and add 20 prospects with source, contact, fit reason, and status.',
        checklist: ['Create tracker columns', 'Search one source first', 'Add 20 prospects', 'Mark top 5 to message'],
        proof_required: 'Screenshot or export of tracker with 20 prospect rows.',
        done_when: '20 prospects are listed and top 5 are marked.',
        estimated_minutes: 35,
        category: 'money',
        leverage_score: 10,
        money_potential: 'high'
      }),
      makeOutcome({
        title: 'Write one outreach message and follow-up',
        objective: 'Use copy that starts real conversations instead of sounding like spam.',
        first_action: 'Copy the message asset and personalize one line for the first 5 prospects.',
        checklist: ['Write direct opener', 'Write softer version', 'Write follow-up', 'Add booking/quote CTA'],
        proof_required: 'Message and follow-up saved in tracker, notes, or TaskPilot.',
        done_when: 'One opener and one follow-up are ready to send.',
        estimated_minutes: 15,
        category: 'money',
        leverage_score: 9,
        money_potential: 'high'
      }),
      makeOutcome({
        title: 'Send the first 5 messages',
        objective: 'Turn the plan into real conversations today.',
        first_action: 'Send the message to the top 5 prospects and mark each row as sent.',
        checklist: ['Send 5 messages', 'Screenshot sent messages', 'Update tracker status', 'Assign follow-up date'],
        proof_required: 'Screenshots of 5 sent messages or tracker rows marked sent.',
        done_when: '5 messages are sent and follow-up dates are assigned.',
        estimated_minutes: 25,
        category: 'money',
        leverage_score: 10,
        money_potential: 'high'
      }),
      makeOutcome({
        title: 'Log replies and next follow-ups',
        objective: 'Create the revenue loop that keeps working after today.',
        first_action: 'Add reply status and next follow-up date for each contacted prospect.',
        checklist: ['Mark replies', 'Schedule follow-ups', 'Add quote/booking notes', 'Log proof'],
        proof_required: 'Tracker screenshot showing sent status, replies, and follow-up dates.',
        done_when: 'All 5 contacted prospects have a next action.',
        estimated_minutes: 10,
        category: 'money',
        leverage_score: 8,
        money_potential: 'high'
      })
    ];
    const assets = [
      { title: 'Prospect tracker columns', content: 'Name | Segment | Source | Contact/Handle | Fit reason | Message sent | Reply | Follow-up date | Notes' },
      { title: 'Direct outreach message', content: 'Hey [name] — quick question. I’m filling a few mobile car detail spots this week and can come to you. Want me to send a quick quote for your vehicle?' },
      { title: 'Soft outreach message', content: 'Hey [name], I run a mobile detailing service and noticed [specific detail]. If you ever want your car cleaned up without driving anywhere, I can send a simple quote.' },
      { title: 'Follow-up message', content: 'Just checking back — I still have a couple detail openings this week if you want pricing + available times.' }
    ];
    return appendAssetSections(
      applyMissionSet(plan, outcomes, {
        detected_work_type: 'service_business_sales',
        plan_style: 'Money-focused',
        interpreted_goal: 'Sell 5 paid car detail appointments through a lightweight cold outreach sprint.',
        plan_title: 'Cold outreach appointment sprint',
        plan_summary: 'A simple prospect → message → follow-up loop built to create paid detail conversations without building a CRM.',
        assumptions: ['No paid ads.', 'No full CRM; use a lightweight tracker.', 'Today is about starting real conversations.'],
        prospect_columns: ['Name', 'Segment', 'Source', 'Contact/Handle', 'Fit reason', 'Message sent', 'Reply', 'Follow-up date', 'Notes'],
        success_metrics: ['20 prospects listed', '5 messages sent', 'Follow-up dates assigned', 'Proof screenshots or tracker export captured'],
        proof_checklist: ['20-row tracker', '5 sent messages', 'Follow-up dates', 'Screenshots or CSV export'],
        message_templates: [
          { id: 'direct', label: 'Direct opener', body: 'Hey [name] — quick question. I’m filling a few mobile car detail spots this week and can come to you. Want me to send a quick quote for your vehicle?' },
          { id: 'follow-up', label: 'Follow-up', body: 'Just checking back — I still have a couple detail openings this week if you want pricing + available times.' }
        ]
      }),
      assets
    );
  }

  if (hasAny(raw, [/hydroponic/, /herb shelf/, /basil/, /mint/, /water\/light/])) {
    const outcomes = [
      makeOutcome({
        title: 'Choose shelf location and size',
        objective: 'Pick a realistic indoor spot before choosing parts.',
        first_action: 'Choose one location and measure approximate width, depth, and height.',
        checklist: ['Pick indoor location', 'Confirm outlet nearby', 'Check light clearance', 'Measure shelf size', 'Take photo'],
        proof_required: 'Photo of chosen location plus rough dimensions.',
        done_when: 'One shelf location is chosen and measured.',
        estimated_minutes: 15,
        category: 'build',
        leverage_score: 8
      }),
      makeOutcome({
        title: 'Create minimum parts and cost list',
        objective: 'Avoid overbuilding by listing only the first prototype parts.',
        first_action: 'Choose one simple method and fill the parts table: container/reservoir, net cups, medium, nutrients, grow light.',
        checklist: ['Pick method', 'List reservoir/container', 'List cups/medium/nutrients', 'Choose light', 'Estimate cost'],
        proof_required: 'Parts list with estimated cost.',
        done_when: 'Minimum parts list and rough cost are complete.',
        estimated_minutes: 25,
        category: 'build',
        leverage_score: 9
      }),
      makeOutcome({
        title: 'Sketch water and light layout',
        objective: 'Make the prototype buildable before buying or assembling.',
        first_action: 'Sketch shelf, water container, plant positions, and light height.',
        checklist: ['Draw shelf layout', 'Mark plant cups', 'Mark reservoir/water line', 'Mark light position', 'Write first 5 build steps'],
        proof_required: 'Photo or screenshot of layout sketch and build steps.',
        done_when: 'Layout and first build steps are documented.',
        estimated_minutes: 25,
        category: 'build',
        leverage_score: 9
      })
    ];
    const assets = [
      { title: 'Parts table', content: 'Part | Qty | Estimated cost | Source | Needed now? | Notes' },
      { title: 'Layout checklist', content: 'Shelf size | Outlet nearby | Reservoir/container | Plant cup positions | LED light height | Spill risk' },
      { title: 'Prototype proof checklist', content: 'Location photo, parts list, layout sketch, first 5 build steps, estimated cost.' }
    ];
    return appendAssetSections(
      applyMissionSet(plan, outcomes, {
        detected_work_type: 'custom',
        plan_style: 'Build-ready',
        interpreted_goal: 'Build a simple indoor hydroponic herb shelf prototype plan for basil and mint.',
        plan_title: 'Hydroponic herb shelf prototype',
        plan_summary: 'Beginner-friendly physical build plan focused on location, parts, layout, and proof before buying or building.',
        assumptions: ['Beginner-friendly prototype; not a fully automated farm.', 'Use common supplies where possible.'],
        proof_checklist: ['Location photo', 'Parts/cost list', 'Water/light layout sketch', 'First build steps']
      }),
      assets
    );
  }

  return appendAssetSections(plan, []);
}
