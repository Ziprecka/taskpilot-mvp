'use client';

type Props = {
  debrief: any;
  onCopy: () => void;
  onViewReport: () => void;
  onPlanTomorrow: () => void;
  onRegenerate: () => void;
};

export function DailyDebriefCard({ debrief, onCopy, onViewReport, onPlanTomorrow, onRegenerate }: Props) {
  if (!debrief) return null;
  return (
    <div className="mb-4 card p-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Daily Debrief Saved</h2>
      <p className="mt-1 text-sm text-slate-300">{debrief.summary}</p>
      {!!debrief.original_goals && <p className="text-sm text-slate-300"><span className="text-slate-500">Original goals:</span> {debrief.original_goals}</p>}
      <p className="text-sm text-slate-300"><span className="text-slate-500">Biggest win:</span> {debrief.biggest_win}</p>
      <p className="text-sm text-slate-300"><span className="text-slate-500">Lesson:</span> {debrief.lesson_learned}</p>
      <p className="text-sm text-slate-300"><span className="text-slate-500">Tomorrow first move:</span> {debrief.tomorrow_first_move}</p>
      <p className="text-xs text-slate-500">Execution {debrief.execution_score}/100 · Money {debrief.money_score}/100</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn-secondary btn-sm" onClick={onCopy}>Copy debrief</button>
        <button className="btn-ghost btn-sm" onClick={onViewReport}>View full report</button>
        <button className="btn-ghost btn-sm" onClick={onPlanTomorrow}>Plan tomorrow</button>
        <button className="btn-ghost btn-sm" onClick={onRegenerate}>Regenerate</button>
      </div>
    </div>
  );
}
