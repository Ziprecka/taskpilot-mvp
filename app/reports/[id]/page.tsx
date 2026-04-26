import { Nav } from '@/components/Nav';
import { ReportView } from '@/components/ReportView';
import { getWorkflowById } from '@/data/sampleWorkflows';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = getWorkflowById(id);
  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <ReportView
          summary={`${workflow.workflow_name} report generated from the current MVP mock data.`}
          completed={workflow.steps.slice(0, 4).map((step) => step.title)}
          issues={['Real issue logging will connect to session events next.']}
          recommendations={['Connect Supabase persistence.', 'Add real file upload.', 'Add screenshot/image vision analysis.']}
        />
      </section>
    </main>
  );
}
