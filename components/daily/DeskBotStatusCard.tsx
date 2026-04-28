'use client';

import Link from 'next/link';

type Props = {
  className: string;
  headline: string;
  mission?: string;
  nextMove?: string;
  syncStatus: 'synced' | 'waiting' | 'fallback' | 'error';
  hint?: string;
};

export function DeskBotStatusCard({ className, headline, mission, nextMove, syncStatus, hint }: Props) {
  return (
    <Link href="/settings/robot" className={className}>
      <p className="font-semibold">DeskBot: {headline.includes('offline') ? 'Offline' : 'Online'}</p>
      <p className="mt-1 text-slate-300">Mission: {mission || 'No mission'}</p>
      <p className="text-slate-400">Next: {nextMove || 'Check in'}</p>
      <p className="text-slate-500">{hint || 'Press = check in'} · {syncStatus}</p>
    </Link>
  );
}
