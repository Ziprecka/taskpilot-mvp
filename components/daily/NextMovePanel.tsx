'use client';

type Props = {
  children: React.ReactNode;
};

export function NextMovePanel({ children }: Props) {
  return (
    <div className="card flex h-[520px] sm:h-[620px] flex-col p-5">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">Next Move</h2>
      {children}
    </div>
  );
}
