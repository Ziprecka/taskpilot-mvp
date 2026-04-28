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
  return (
    <Link href="/settings/robot" className={className}>
      <p className="font-semibold">DeskBot: {headline.includes('offline') ? 'Offline' : 'Online'}</p>
      <p className="mt-1 text-slate-300">Showing: {mission || 'Plan today'}</p>
      <p className="text-slate-400">Next: {nextMove || 'Create daily plan'}</p>
      <p className="text-slate-400">Proof: {proof || 'Start first mission'}</p>
      <p className="text-slate-500">{hint || 'Press = check in'} · {syncStatus}</p>
      {syncStatus === 'fallback' && <p className="mt-1 text-amber-300">DeskBot needs sync</p>}
    </Link>
  );
}
