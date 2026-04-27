export function ReportView({ summary, completed, issues, recommendations }: { summary: string; completed: string[]; issues: string[]; recommendations: string[] }) {
  const markdown = `# Workflow Report

## Executive summary
${summary}

## Steps completed
${completed.map((item) => `- ${item}`).join('\n')}

## Issues detected
${issues.length ? issues.map((item) => `- ${item}`).join('\n') : '- None'}

## Next recommended workflows
${recommendations.map((item) => `- ${item}`).join('\n')}
`;
  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskpilot-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="card p-6">
      <h1 className="mb-3 text-2xl font-black">Workflow Report</h1>
      <p className="mb-5 text-slate-300">{summary}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h3 className="mb-2 font-bold">Completed</h3>
          {completed.map((item) => <p key={item} className="text-sm text-slate-400">✓ {item}</p>)}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h3 className="mb-2 font-bold">Issues</h3>
          {issues.length ? issues.map((item) => <p key={item} className="text-sm text-slate-400">• {item}</p>) : <p className="text-sm text-slate-400">No major issues logged.</p>}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <h3 className="mb-2 font-bold">Recommendations</h3>
          {recommendations.map((item) => <p key={item} className="text-sm text-slate-400">→ {item}</p>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-secondary text-sm" onClick={() => navigator.clipboard.writeText(markdown)}>Copy report</button>
        <button className="btn-secondary text-sm" onClick={downloadMarkdown}>Download markdown</button>
        <button className="btn-secondary text-sm">Save report</button>
      </div>
    </div>
  );
}
