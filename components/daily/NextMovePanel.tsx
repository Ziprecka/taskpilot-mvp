'use client';

type Props = {
  children: React.ReactNode;
};

export function NextMovePanel({ children }: Props) {
  return (
    <div className="card flex min-h-[220px] max-w-full flex-col overflow-hidden p-4 sm:h-[620px] sm:p-5">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">Next Move</h2>
      {children}
    </div>
  );
}
