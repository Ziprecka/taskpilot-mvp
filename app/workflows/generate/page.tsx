'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { saveGeneratedWorkflow } from '@/lib/workflowPersistence';
import type { Workflow } from '@/types/workflow';

const PROMPT_CHIPS = [
  'Build a Raspberry Pi desktop robot client',
  'Debug a Next.js deployment issue',
  'Create a Google Ads campaign',
  'Build an Arduino sensor project',
  'Research a product idea',
  'Create a service business SOP',
  'Create a daily execution plan'
];

export default function GenerateWorkflowPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    goal: '',
    category: 'coding',
    skill_level: 'intermediate',
    desired_outcome: '',
    tools: '',
    blockers: '',
    steps_count: 10,
    mode: 'guide',
    output_style: 'technical checklist'
  });
  const [generated, setGenerated] = useState<Workflow | null>(null);
  const [source, setSource] = useState<'openai' | 'mock'>('mock');
  const [loading, setLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [runMode, setRunMode] = useState<'guided' | 'fast_checklist' | 'debug' | 'proof' | 'robot'>('guided');
  const [notice, setNotice] = useState('');
  const [requiresLoginToSave, setRequiresLoginToSave] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/workflows/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await res.json();
    if (!payload?.ok) {
      setNotice(payload?.error || 'Generation failed.');
      setLoading(false);
      return;
    }
    const raw = payload.workflow as any;
    const id = raw.id || raw.slug || raw.workflow_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const workflow: Workflow = {
      id,
      workflow_name: raw.workflow_name || form.goal || 'Generated workflow',
      category: raw.category || form.category,
      difficulty: raw.difficulty || form.skill_level,
      estimated_time: raw.estimated_time || '90 minutes',
      required_tools: Array.isArray(raw.required_tools) ? raw.required_tools : [],
      required_materials: Array.isArray(raw.required_materials) ? raw.required_materials : [],
      prerequisites: Array.isArray(raw.prerequisites) ? raw.prerequisites : [],
      completion_criteria: raw.completion_criteria || 'All steps complete.',
      report_template: raw.report_template?.summary
        ? raw.report_template
        : {
            summary: 'Generated workflow completed.',
            issues_found: [],
            fixes_made: [],
            recommendations: ['Capture proof', 'Summarize output']
          },
      steps: (Array.isArray(raw.steps) ? raw.steps : []).map((step: any, index: number) => ({
        step_number: Number(step.step_number || index + 1),
        title: step.title || `Step ${index + 1}`,
        instructions: step.instructions || '',
        expected_state: step.expected_state || '',
        visual_checks: Array.isArray(step.visual_checks) ? step.visual_checks : [],
        common_mistakes: Array.isArray(step.common_mistakes) ? step.common_mistakes : [],
        troubleshooting: Array.isArray(step.troubleshooting) ? step.troubleshooting : [],
        completion_criteria: step.completion_criteria || 'Step complete.'
      })),
      generation_quality: raw.generation_quality ?? {
        specificity_score: 80,
        actionability_score: 80,
        verifiability_score: 80,
        estimated_usefulness_score: 80,
        usability_score: 80,
        missing_details: [],
        improvement_suggestions: []
      }
    };
    setGenerated(workflow);
    setSource(payload.source === 'openai' ? 'openai' : 'mock');
    setRequiresLoginToSave(Boolean(payload.requires_login_to_save));
    setNotice(payload.requires_login_to_save ? 'You are in demo mode. Login required to save workflows.' : '');
    setSaved(false);
    setWizardStep(2);
    setLoading(false);
  }

  async function improveWorkflow() {
    if (!generated) return;
    setImproving(true);
    const res = await fetch('/api/workflows/improve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow: generated })
    });
    const payload = await res.json();
    if (payload?.ok && payload?.workflow) setGenerated(payload.workflow as Workflow);
    setImproving(false);
  }

  async function saveAndOptionallySync(workflow: Workflow) {
    saveGeneratedWorkflow(workflow);
    const health = await fetch('/api/health').then((res) => res.json()).catch(() => null);
    if (health?.env?.supabaseEnabled) {
      await fetch('/api/db/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: workflow.id,
          name: workflow.workflow_name,
          category: workflow.category,
          difficulty: workflow.difficulty,
          goal: workflow.completion_criteria,
          description: workflow.completion_criteria,
          estimated_time: workflow.estimated_time,
          required_tools: workflow.required_tools,
          required_materials: workflow.required_materials,
          source: 'generated',
          steps: workflow.steps.map((s) => ({
            step_number: s.step_number,
            title: s.title,
            instructions: s.instructions,
            expected_state: s.expected_state,
            common_mistakes: s.common_mistakes,
            visual_checks: s.visual_checks,
            completion_criteria: s.completion_criteria
          }))
        })
      });
    }
    setSaved(true);
    setWizardStep(3);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-2 text-3xl font-black">Generate Workflow</h1>
        <p className="mb-5 text-slate-400">Step {wizardStep} of 3 · Turn your goal into a practical, demo-ready workflow.</p>

        {wizardStep === 1 && (
          <div className="card mb-5 p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Step 1 · Describe Goal</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {PROMPT_CHIPS.map((chip) => (
                <button key={chip} className="btn-secondary text-xs" onClick={() => setForm((prev) => ({ ...prev, goal: chip }))}>
                  {chip}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <textarea className="input md:col-span-2 min-h-24" placeholder="What are you trying to accomplish?" value={form.goal} onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value }))} />
              <select className="input" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                <option value="coding">coding</option>
                <option value="electronics">electronics</option>
                <option value="research">research</option>
                <option value="3d_printing">3d_printing</option>
                <option value="business_sop">business_sop</option>
                <option value="productivity">productivity</option>
                <option value="deployment">deployment</option>
                <option value="custom">custom</option>
              </select>
              <select className="input" value={form.skill_level} onChange={(e) => setForm((prev) => ({ ...prev, skill_level: e.target.value }))}>
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
              <input className="input" placeholder="Desired outcome" value={form.desired_outcome} onChange={(e) => setForm((prev) => ({ ...prev, desired_outcome: e.target.value }))} />
              <input className="input" placeholder="Tools/platforms involved" value={form.tools} onChange={(e) => setForm((prev) => ({ ...prev, tools: e.target.value }))} />
              <input className="input" placeholder="Known blockers" value={form.blockers} onChange={(e) => setForm((prev) => ({ ...prev, blockers: e.target.value }))} />
              <select className="input" value={String(form.steps_count)} onChange={(e) => setForm((prev) => ({ ...prev, steps_count: Number(e.target.value) }))}>
                <option value="6">6 steps</option>
                <option value="8">8 steps</option>
                <option value="10">10 steps</option>
                <option value="12">12 steps</option>
                <option value="14">14 steps</option>
              </select>
              <select className="input" value={form.output_style} onChange={(e) => setForm((prev) => ({ ...prev, output_style: e.target.value }))}>
                <option value="beginner guide">beginner guide</option>
                <option value="technical checklist">technical checklist</option>
                <option value="debug workflow">debug workflow</option>
                <option value="training sop">training SOP</option>
                <option value="proof-based workflow">proof-based workflow</option>
              </select>
            </div>
            <button className="btn-primary mt-4 w-full sm:w-auto" onClick={generate} disabled={loading || !form.goal.trim()}>
              {loading ? 'TaskPilot is turning your goal into a guided workflow...' : 'Generate Workflow'}
            </button>
            {notice && <p className="mt-2 text-sm text-amber-300">{notice}</p>}
          </div>
        )}

        {wizardStep === 2 && generated && (
          <div className="card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Step 2 · Generate + Preview</h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="badge">Source: {source}</p>
              <p className="badge">Specificity: {generated.generation_quality?.specificity_score ?? 0}/100</p>
              <p className="badge">Actionability: {generated.generation_quality?.actionability_score ?? generated.generation_quality?.usability_score ?? 0}/100</p>
              <p className="badge">Verifiability: {generated.generation_quality?.verifiability_score ?? 0}/100</p>
              <p className="badge">Estimated usefulness: {generated.generation_quality?.estimated_usefulness_score ?? generated.generation_quality?.usability_score ?? 0}/100</p>
            </div>
            <input className="input mb-2" value={generated.workflow_name} onChange={(e) => setGenerated((prev) => (prev ? { ...prev, workflow_name: e.target.value } : prev))} />
            <p className="mb-3 text-sm text-slate-400">{generated.steps.length} steps · {generated.category} · {generated.difficulty}</p>
            <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">
              <p className="font-semibold text-white">Completion criteria</p>
              <p>{generated.completion_criteria}</p>
            </div>
            {generated.generation_quality?.missing_details?.length ? (
              <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                Missing details: {generated.generation_quality.missing_details.join(' | ')}
              </div>
            ) : null}
            <div className="space-y-2">
              {generated.steps.map((step, idx) => (
                <div key={step.step_number} className="rounded-xl border border-slate-700 p-3">
                  <p className="font-semibold text-white">{step.step_number}. {step.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{step.instructions}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-slate-400">Expected state</summary>
                    <p className="mt-1 text-sm text-slate-300">{step.expected_state}</p>
                  </details>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-slate-400">Common mistakes</summary>
                    <p className="mt-1 text-sm text-slate-300">{step.common_mistakes.join(' | ') || 'None listed.'}</p>
                  </details>
                  {editing && (
                    <div className="mt-2 space-y-2">
                      <input className="input" value={step.title} onChange={(e) => setGenerated((prev) => prev ? {
                        ...prev,
                        steps: prev.steps.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                      } : prev)} />
                      <textarea className="input min-h-16" value={step.instructions} onChange={(e) => setGenerated((prev) => prev ? {
                        ...prev,
                        steps: prev.steps.map((s, i) => (i === idx ? { ...s, instructions: e.target.value } : s))
                      } : prev)} />
                      <textarea className="input min-h-12" value={step.expected_state} onChange={(e) => setGenerated((prev) => prev ? {
                        ...prev,
                        steps: prev.steps.map((s, i) => (i === idx ? { ...s, expected_state: e.target.value } : s))
                      } : prev)} />
                      <textarea className="input min-h-12" value={step.common_mistakes.join('\n')} onChange={(e) => setGenerated((prev) => prev ? {
                        ...prev,
                        steps: prev.steps.map((s, i) => (i === idx ? { ...s, common_mistakes: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) } : s))
                      } : prev)} />
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary text-xs" onClick={() => setGenerated((prev) => prev ? { ...prev, steps: prev.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 })) } : prev)}>Delete step</button>
                        <button className="btn-secondary text-xs" onClick={() => setGenerated((prev) => prev ? {
                          ...prev,
                          steps: [...prev.steps, { ...step, step_number: prev.steps.length + 1, title: 'New step', instructions: '', expected_state: '', common_mistakes: [], visual_checks: [], troubleshooting: [], completion_criteria: 'Step complete.' }]
                        } : prev)}>Add step</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={generate}>Regenerate</button>
              <button className="btn-secondary" onClick={improveWorkflow} disabled={improving}>{improving ? 'Improving...' : 'Improve Workflow'}</button>
              <button className="btn-secondary" onClick={() => setEditing((prev) => !prev)}>{editing ? 'Done Editing' : 'Edit workflow'}</button>
              <button className="btn-primary" onClick={async () => generated && !requiresLoginToSave && saveAndOptionallySync(generated)} disabled={requiresLoginToSave}>{requiresLoginToSave ? 'Login to Save' : 'Save and Start'}</button>
            </div>
          </div>
        )}

        {wizardStep === 3 && generated && saved && (
          <div className="card p-4 sm:p-5">
            <h2 className="mb-2 text-2xl font-black">Step 3 · Saved</h2>
            <p className="mb-3 text-slate-300">Workflow saved. You can start now or review saved workflows.</p>
            <select className="input mb-3 max-w-xs" value={runMode} onChange={(e) => setRunMode(e.target.value as 'guided' | 'fast_checklist' | 'debug' | 'proof' | 'robot')}>
              <option value="guided">Guided Mode</option>
              <option value="fast_checklist">Fast Checklist Mode</option>
              <option value="debug">Debug Mode</option>
              <option value="proof">Proof Mode</option>
              <option value="robot">Robot Mode</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => router.push(`/session/${generated.id}?goal=${encodeURIComponent(form.goal || generated.workflow_name)}&mode=${runMode}`)}>Start Workflow</button>
              <button className="btn-secondary" onClick={() => router.push('/workflows/saved')}>View Saved Workflows</button>
              <button className="btn-secondary" onClick={() => {
                setWizardStep(1);
                setGenerated(null);
                setSaved(false);
                setEditing(false);
              }}>Generate Another</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
