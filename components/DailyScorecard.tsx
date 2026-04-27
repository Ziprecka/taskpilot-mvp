'use client';

export function DailyScorecard(props: {
  executionScore: number;
  focusMinutes: number;
  outcomesCompleted: number;
  outcomesTotal: number;
  proofLogged: number;
  streak: number;
  xpToday: number;
  level: number;
}) {
  const { executionScore, focusMinutes, outcomesCompleted, outcomesTotal, proofLogged, streak, xpToday, level } = props;
  return (
    <div className="grid gap-2 rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm sm:grid-cols-4 lg:grid-cols-8">
      <p><span className="text-slate-500">Execution</span><br />{executionScore}</p>
      <p><span className="text-slate-500">Focus</span><br />{focusMinutes}m</p>
      <p><span className="text-slate-500">Outcomes</span><br />{outcomesCompleted}/{outcomesTotal}</p>
      <p><span className="text-slate-500">Evidence</span><br />{proofLogged}</p>
      <p><span className="text-slate-500">Streak</span><br />{streak}d</p>
      <p><span className="text-slate-500">XP</span><br />+{xpToday}</p>
      <p><span className="text-slate-500">Level</span><br />{level}</p>
      <p><span className="text-slate-500">Mode</span><br />Operator</p>
    </div>
  );
}

