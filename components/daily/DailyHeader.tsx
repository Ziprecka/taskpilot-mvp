'use client';

import Link from 'next/link';

type Props = {
  date: string;
  status: string;
  streak: number;
  completedToday: number;
  focusMinutesToday: number;
  xpToday: number;
  totalXp: number;
  level: number;
  aiMode: 'openai' | 'mock';
  syncLabel: string;
  betaAdmin: boolean;
  savedAtLabel: string;
  deskBotBadgeClass: string;
  deskBotBadgeText: string;
  deskBotUiTick: number;
  onCloseDay: () => void;
  onPlanToday: () => void;
  onResetDay: () => void;
};

export function DailyHeader(props: Props) {
  return (
    <div className="sticky top-0 z-30 mb-4 max-w-full overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/92 p-3 backdrop-blur sm:static sm:mb-5 sm:border-0 sm:bg-transparent sm:p-0">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="badge mb-1">Today</p>
          <h1 className="truncate text-xl font-black sm:text-3xl">Daily Command Center</h1>
          <p className="mt-1 break-words text-xs text-slate-400 sm:text-sm">{props.date} · Status: {props.status}</p>
          <p className="mt-1 break-words text-xs text-slate-500">Streak {props.streak} · XP +{props.xpToday} · Done {props.completedToday}</p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block" title="Lifetime XP is never reset when you reset the day.">Total XP: {props.totalXp} · Level: {props.level} Operator · Focus minutes: {props.focusMinutesToday}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <span className="badge hidden sm:inline-flex">AI: {props.aiMode === 'openai' ? 'OpenAI' : 'Mock'}</span>
          <span className="badge hidden sm:inline-flex">Sync: {props.syncLabel}</span>
          {props.betaAdmin && <span className="badge hidden sm:inline-flex">Beta Admin</span>}
          <span className="badge hidden sm:inline-flex">Saved: {props.savedAtLabel}</span>
          <Link href="/settings/robot" className={`badge max-w-full cursor-pointer border transition hover:border-amber-400/45 ${props.deskBotBadgeClass}`} title="DeskBot · Atom S3R status">
            <span className="truncate">{props.deskBotBadgeText}</span>
            <span className="sr-only">{props.deskBotUiTick}</span>
          </Link>
          <button className="btn-secondary btn-sm" onClick={props.onCloseDay}>Close Day</button>
          <button className="btn-ghost btn-sm" onClick={props.onPlanToday}>Plan Today</button>
          <button className="btn-ghost btn-sm" onClick={props.onResetDay}>Reset Day</button>
        </div>
      </div>
    </div>
  );
}
