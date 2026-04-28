'use client';

type Props = {
  open: boolean;
  shownEvents: Array<{ id: string; created_at: string; type: string; content: string }>;
  hasMore: boolean;
  showAllEvents: boolean;
  onToggleAll: () => void;
};

export function DailyTimeline({ open, shownEvents, hasMore, showAllEvents, onToggleAll }: Props) {
  return (
    <details className="card p-5" open={open}>
      <summary className="cursor-pointer text-sm font-bold uppercase tracking-widest text-slate-400">Progress Timeline</summary>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Progress Timeline</h2>
      <div className="space-y-1 text-sm text-slate-300">
        {shownEvents.map((event) => (
          <p key={event.id}>{new Date(event.created_at).toLocaleTimeString()} · {event.content}</p>
        ))}
        {!shownEvents.length && <p className="text-slate-500">No progress logged yet. Start a focus block or mark an outcome complete.</p>}
      </div>
      {hasMore && <button className="btn-ghost btn-sm mt-2" onClick={onToggleAll}>{showAllEvents ? 'View latest 10' : 'View all'}</button>}
    </details>
  );
}
