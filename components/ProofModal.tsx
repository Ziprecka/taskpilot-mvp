'use client';

import { useMemo, useState } from 'react';
import type { DailyProofItem } from '@/types/workflow';

type ProofType = 'screenshot' | 'photo' | 'link' | 'text' | 'file';

export function ProofModal(props: {
  open: boolean;
  outcomeTitle: string;
  onClose: () => void;
  onSave: (item: DailyProofItem) => void;
  outcomeId: string;
}) {
  const { open, outcomeTitle, onClose, onSave, outcomeId } = props;
  const [proofType, setProofType] = useState<ProofType>('screenshot');
  const [note, setNote] = useState('');
  const [fileMeta, setFileMeta] = useState<{ name?: string; type?: string; size?: number; dataUrl?: string }>({});
  const [error, setError] = useState('');

  const preview = useMemo(() => fileMeta.dataUrl, [fileMeta.dataUrl]);
  if (!open) return null;

  function handleFile(file?: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError('Max file size is 10MB.');
    const reader = new FileReader();
    reader.onload = () => {
      setFileMeta({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result || '') });
      setError('');
    };
    reader.readAsDataURL(file);
  }

  function save() {
    if (!note.trim() && !fileMeta.dataUrl) {
      setError('Add a screenshot, photo, link, or note before saving.');
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      outcome_id: outcomeId,
      type: proofType,
      note: note.trim(),
      file_name: fileMeta.name,
      file_type: fileMeta.type,
      file_size: fileMeta.size,
      data_url: fileMeta.dataUrl,
      created_at: new Date().toISOString()
    });
    setNote('');
    setFileMeta({});
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black">Log proof</h2>
        <p className="text-sm text-slate-400">Add visible evidence that this outcome moved forward.</p>
        <p className="mt-1 text-xs text-slate-500">Outcome: {outcomeTitle}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['screenshot', 'photo', 'link', 'text', 'file'] as ProofType[]).map((type) => (
            <button key={type} className={`btn-secondary btn-sm ${proofType === type ? 'border-amber-400 text-amber-100' : ''}`} onClick={() => setProofType(type)}>{type}</button>
          ))}
        </div>
        <label className="mt-3 block rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-300">
          Drag/drop or choose file
          <input className="mt-2 block w-full" type="file" accept="image/png,image/jpeg,image/webp,image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
        {preview && <img src={preview} alt="proof preview" className="mt-3 max-h-44 rounded-lg border border-slate-700 object-contain" />}
        <textarea className="input mt-3 min-h-24" placeholder="What did you complete? Paste a link, describe the proof, or add context." value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p className="mt-2 text-sm text-amber-200">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" onClick={save}>Save proof</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

