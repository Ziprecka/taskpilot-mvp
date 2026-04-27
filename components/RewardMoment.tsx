'use client';

export function RewardMoment(props: {
  open: boolean;
  title: string;
  xp: number;
  copy: string;
  next: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={props.onClose}>
      <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-slate-950/95 p-5 shadow-[0_0_40px_rgba(245,158,11,0.2)]" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm uppercase tracking-widest text-amber-200">Reward earned</p>
        <h2 className="mt-1 text-2xl font-black">{props.title}</h2>
        <p className="mt-1 text-xl font-bold text-amber-200">+{props.xp} XP</p>
        <p className="mt-2 text-sm text-slate-300">{props.copy}</p>
        <p className="mt-1 text-xs text-slate-500">Next: {props.next}</p>
        <div className="mt-4 grid gap-2">
          <button className="btn-primary w-full" onClick={props.onPrimary || props.onClose}>{props.primaryLabel || 'Continue mission'}</button>
          {props.secondaryLabel && (
            <button className="btn-ghost w-full" onClick={props.onSecondary || props.onClose}>{props.secondaryLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}

