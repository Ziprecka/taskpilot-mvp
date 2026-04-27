'use client';

import { useRef, useState } from 'react';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, isAcceptedImage, toSessionUpload } from '@/lib/fileUtils';
import type { SessionNote, SessionUpload } from '@/types/workflow';

export function UploadPanel({
  uploads,
  notes,
  onAddUpload,
  onRemoveUpload,
  onAddNote,
  onClearContext,
  onCheckLatestProof
}: {
  uploads: SessionUpload[];
  notes: SessionNote[];
  onAddUpload: (upload: SessionUpload) => void;
  onRemoveUpload: (id: string) => void;
  onAddNote: (content: string) => void;
  onClearContext: () => void;
  onCheckLatestProof: () => void;
}) {
  const [noteInput, setNoteInput] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      if (!isAcceptedImage(file)) {
        setError('Only png, jpg/jpeg, and webp are supported.');
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError('File too large. Use an image under 10MB.');
        continue;
      }
      try {
        const upload = await toSessionUpload(file);
        onAddUpload(upload);
        setError('');
      } catch {
        setError('Failed to process upload.');
      }
    }
  }

  function saveNote() {
    if (!noteInput.trim()) return;
    onAddNote(noteInput.trim());
    setNoteInput('');
  }

  return (
    <div className="card card-list p-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Proof / Context</h2>
      <p className="mb-3 text-sm text-slate-400">{uploads.length} uploads · {notes.length} notes</p>
      <div
        className="mb-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
      >
        Drag and drop screenshot/photo here, paste image from clipboard, or use picker.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>Choose images</button>
        <button
          className="btn-secondary btn-sm"
          onClick={async () => {
            try {
              const items = await navigator.clipboard.read();
              for (const item of items) {
                const type = item.types.find((t) => ACCEPTED_IMAGE_TYPES.includes(t));
                if (!type) continue;
                const blob = await item.getType(type);
                const file = new File([blob], `clipboard-${Date.now()}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`, { type });
                const fakeList = { 0: file, length: 1, item: () => file } as unknown as FileList;
                await handleFiles(fakeList);
              }
            } catch {
              setError('Clipboard paste unavailable in this browser.');
            }
          }}
        >
          Paste from clipboard
        </button>
        <button className="btn-ghost btn-sm" onClick={onClearContext}>Clear context</button>
        <button className="btn-secondary btn-sm" onClick={onCheckLatestProof}>Check latest proof</button>
      </div>
      {error && <p className="mb-3 text-sm text-amber-300">{error}</p>}
      <textarea
        className="input min-h-24"
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        placeholder="Add context note: what you changed, what screenshot shows, what failed..."
      />
      <button className="btn-secondary btn-sm mt-2" onClick={saveNote}>Save context note</button>
      {!!uploads.length && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="rounded-xl border border-slate-700 bg-slate-950/40 p-2">
              <img src={upload.dataUrl} alt={upload.name} className="h-28 w-full rounded-lg object-cover" />
              <p className="mt-2 text-xs text-slate-300">{upload.name}</p>
              <p className="text-xs text-slate-500">{new Date(upload.created_at).toLocaleTimeString()} · Use as proof</p>
              <button className="btn-secondary mt-2 text-xs" onClick={() => onRemoveUpload(upload.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
