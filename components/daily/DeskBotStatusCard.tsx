'use client';

import Link from 'next/link';

type Props = {
  className: string;
  headline: string;
  mission?: string;
  nextMove?: string;
  proof?: string;
  syncStatus: 'synced' | 'waiting' | 'fallback' | 'error';
  hint?: string;
};

export function DeskBotStatusCard({ className, headline, mission, nextMove, proof, syncStatus, hint }: Props) {
  const online = !headline.toLowerCase().includes('offline');
  const shortMission = mission ? (mission.length > 26 ? `${mission.slice(0, 26)}…` : mission) : 'Plan today';

  return (
    <Link href="/settings/robot" className={`${className} max-w-full overflow-hidden`}>
      <p className="font-semibold sm:hidden">DeskBot: {online ? 'Online' : 'Offline'} · Showing: {shortMission}</p>
      <details className="mt-1 sm:hidden">
        <summary className="cursor-pointer text-slate-400">Details</summary>
        <p className="mt-1 break-words text-slate-300">Mission: {mission || 'Plan today'}</p>
        <p className="break-words text-slate-400">Next: {nextMove || 'Create daily plan'}</p>
        <p className="break-words text-slate-400">Proof: {proof || 'Start first mission'}</p>
        <p className="text-slate-500">{hint || 'Press = check in'} · {syncStatus}</p>
      </details>
      <div className="hidden sm:block">
        <p className="font-semibold">DeskBot: {online ? 'Online' : 'Offline'}</p>
        <p className="mt-1 break-words text-slate-300">Showing: {mission || 'Plan today'}</p>
        <p className="break-words text-slate-400">Next: {nextMove || 'Create daily plan'}</p>
        <p className="break-words text-slate-400">Proof: {proof || 'Start first mission'}</p>
        <p className="text-slate-500">{hint || 'Press = check in'} · {syncStatus}</p>
      </div>
      {syncStatus === 'fallback' && <p className="mt-1 text-amber-300">DeskBot needs sync</p>}
    </Link>
  );
}
