export const PLAN_BUILDER_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'interpreted_goal',
    'confidence',
    'plan_style',
    'execution_pattern',
    'assumptions',
    'constraints_respected',
    'prohibited_items',
    'deliverables',
    'proof_checklist',
    'missions',
    'copilot_seed'
  ],
  properties: {
    interpreted_goal: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    plan_style: { type: 'string', enum: ['Fast win', 'Deep work', 'Money-focused', 'Build-ready', 'Learning'] },
    execution_pattern: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
    constraints_respected: { type: 'array', items: { type: 'string' } },
    prohibited_items: { type: 'array', items: { type: 'string' } },
    deliverables: { type: 'array', items: { type: 'string' } },
    proof_checklist: { type: 'array', items: { type: 'string' } },
    missions: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'objective',
          'first_action',
          'checklist',
          'proof_required',
          'done_when',
          'estimated_minutes',
          'leverage_score',
          'money_potential',
          'risk',
          'helper_assets_needed'
        ],
        properties: {
          title: { type: 'string' },
          objective: { type: 'string' },
          first_action: { type: 'string' },
          checklist: { type: 'array', items: { type: 'string' } },
          proof_required: { type: 'string' },
          done_when: { type: 'string' },
          estimated_minutes: { type: 'number' },
          leverage_score: { type: 'number' },
          money_potential: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
          risk: { type: 'string' },
          helper_assets_needed: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    copilot_seed: {
      type: 'object',
      additionalProperties: false,
      required: ['next_action', 'draft_assets', 'likely_blockers'],
      properties: {
        next_action: { type: 'string' },
        draft_assets: { type: 'array', items: { type: 'string' } },
        likely_blockers: { type: 'array', items: { type: 'string' } }
      }
    }
  }
} as const;

