'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { PlanBuilder } from '@/components/PlanBuilder';
import { saveGeneratedWorkflow } from '@/lib/workflowPersistence';
import type { Workflow } from '@/types/workflow';
import type { PlanBuilderOutput } from '@/types/planBuilder';

export default function GenerateWorkflowPage() {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  async function onSavePlaybook(workflow: Workflow, _plan: PlanBuilderOutput) {
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
      }).catch(() => null);
    }
    router.push('/workflows/saved');
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="badge mb-2">Playbooks</p>
        <h1 className="mb-2 text-3xl font-black">Create playbook</h1>
        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          Same Plan Builder engine as Today — tuned for repeatable systems. Build a preview, adjust work type if needed, then save to your library.
        </p>
        <PlanBuilder
          defaultMode="playbook"
          goalText={goal}
          onGoalTextChange={setGoal}
          showIntake
          modalOpen={modalOpen}
          onModalOpenChange={setModalOpen}
          onSavePlaybook={onSavePlaybook}
        />
      </section>
    </main>
  );
}
