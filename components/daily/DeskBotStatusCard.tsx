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
      <p className="font-semibold">{headline}</p>
      {!!mission && <p className="mt-1 text-slate-300">Mission: {mission}</p>}
      {!!nextMove && <p className="mt-1 text-slate-400">Next: {nextMove}</p>}
      <p className="mt-1 text-slate-400">
        DeskBot State:{' '}
        {syncStatus === 'synced' && 'Synced to current mission'}
        {syncStatus === 'waiting' && 'Waiting for next poll'}
        {syncStatus === 'fallback' && 'Fallback/no mission'}
        {syncStatus === 'error' && 'Sync error'}
      </p>
      {syncStatus === 'fallback' && <p className="mt-1 text-amber-300">Robot API cannot see the active Daily mission yet.</p>}
      <p className="mt-1 text-slate-500">{hint || 'Press = check in'}</p>
    </Link>
  );
}
