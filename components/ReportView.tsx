export function ReportView({ summary, completed, issues, recommendations }: { summary: string; completed: string[]; issues: string[]; recommendations: string[] }) {
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
    </div>
  );
}
