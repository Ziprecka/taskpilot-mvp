'use client';

import type { CopilotExecutionOutput, CopilotMode } from '@/lib/copilot';

type Props = {
  copilotMode: CopilotMode;
  effectiveCopilot: CopilotExecutionOutput;
  artifactsToShow: Array<{ label: string; content: string }>;
  onRefresh: (mode: CopilotMode) => void;
  onCopyMain: () => void;
  onLogProof: () => void;
  onComplete: () => void;
};

export function CopilotCard(props: Props) {
  return (
    <>
      <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">Copilot</h2>
      <p className="mb-2 text-xs text-slate-500">Produces execution assets for the current mission.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className={`btn-secondary btn-sm ${props.copilotMode === 'action' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => props.onRefresh('action')}>Next action</button>
        <button className={`btn-secondary btn-sm ${props.copilotMode === 'draft' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => props.onRefresh('draft')}>Draft it</button>
        <button className={`btn-secondary btn-sm ${props.copilotMode === 'blocked' ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => props.onRefresh('blocked')}>Blocked</button>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
        <p className="font-semibold text-white">{props.effectiveCopilot.title}</p>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Action</p>
          <p className="break-words">{props.effectiveCopilot.immediate_action}</p>
        </div>
        {!!props.effectiveCopilot.where_to_go?.length && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Where</p>
            <ul className="list-inside list-disc text-sm">
              {props.effectiveCopilot.where_to_go.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {(props.effectiveCopilot.make_this || props.effectiveCopilot.template) && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Make / Template</p>
            {props.effectiveCopilot.make_this ? <p className="break-words whitespace-pre-wrap">{props.effectiveCopilot.make_this}</p> : null}
            {props.effectiveCopilot.template ? <p className="mt-1 break-words whitespace-pre-wrap rounded-md border border-slate-700 bg-slate-900/60 p-2">{props.effectiveCopilot.template}</p> : null}
          </div>
        )}
        {!!props.effectiveCopilot.checklist?.length && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Checklist</p>
            <ul className="list-inside list-disc text-sm">
              {props.effectiveCopilot.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Proof</p>
          <p className="break-words">{props.effectiveCopilot.proof_required}</p>
        </div>
      </div>

      {!!props.artifactsToShow.length && (
        <div className="mt-3 space-y-2">
          {props.artifactsToShow.map((artifact) => (
            <div key={artifact.label} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{artifact.label}</p>
                <button className="btn-secondary btn-sm h-10" onClick={() => navigator.clipboard.writeText(artifact.content)}>Copy</button>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-200">{artifact.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-secondary btn-sm" onClick={props.onCopyMain}>Copy</button>
        <button className="btn-secondary btn-sm" onClick={props.onLogProof}>Log proof</button>
        <button className="btn-secondary btn-sm" onClick={props.onComplete}>Complete</button>
      </div>
    </>
  );
}

