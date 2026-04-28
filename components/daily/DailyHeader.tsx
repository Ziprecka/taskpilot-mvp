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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="badge mb-2">Today&apos;s execution cockpit</p>
        <h1 className="text-3xl font-black">Daily Command Center</h1>
        <p className="mt-1 text-sm text-slate-400">{props.date} · Status: {props.status}</p>
        <p className="mt-1 text-xs text-slate-500">Streak: {props.streak} days · Completed today: {props.completedToday} · Focus minutes: {props.focusMinutesToday}</p>
        <p className="mt-1 text-xs text-slate-500" title="Lifetime XP is never reset when you reset the day.">Today XP: +{props.xpToday} · Total XP: {props.totalXp} · Level: {props.level} Operator</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="badge">AI: {props.aiMode === 'openai' ? 'OpenAI' : 'Mock'}</span>
        <span className="badge">Sync: {props.syncLabel}</span>
        {props.betaAdmin && <span className="badge">Beta Admin</span>}
        <span className="badge">Saved: {props.savedAtLabel}</span>
        <Link href="/settings/robot" className={`badge cursor-pointer border transition hover:border-amber-400/45 ${props.deskBotBadgeClass}`} title="DeskBot · Atom S3R status">
          {props.deskBotBadgeText}
          <span className="sr-only">{props.deskBotUiTick}</span>
        </Link>
        <button className="btn-secondary btn-sm" onClick={props.onCloseDay}>Close Day</button>
        <button className="btn-ghost btn-sm" onClick={props.onPlanToday}>Plan Today</button>
        <button className="btn-ghost btn-sm" onClick={props.onResetDay}>Reset Day</button>
      </div>
    </div>
  );
}
