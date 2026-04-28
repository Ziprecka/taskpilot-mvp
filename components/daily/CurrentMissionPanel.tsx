'use client';

type Props = {
  children: React.ReactNode;
};

export function CurrentMissionPanel({ children }: Props) {
  return (
    <div className="card max-w-full overflow-hidden p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Current Mission</h2>
      {children}
    </div>
  );
}
