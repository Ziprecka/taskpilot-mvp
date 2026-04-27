'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Command = { label: string; href: string };

const COMMANDS: Command[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Daily Mode', href: '/daily' },
  { label: 'Generate Workflow', href: '/workflows/generate' },
  { label: 'Saved Workflows', href: '/workflows/saved' },
  { label: 'Saved Sessions', href: '/sessions' },
  { label: 'Start New Workflow', href: '/workflows/new' },
  { label: 'Demo', href: '/demo' },
  { label: 'Setup', href: '/settings/setup' },
  { label: 'Deploy', href: '/settings/deploy' },
  { label: 'Mobile', href: '/settings/mobile' },
  { label: 'Robot API', href: '/settings/robot' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'Account', href: '/account' },
  { label: 'Pricing', href: '/pricing' }
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dynamicCommands, setDynamicCommands] = useState<Command[]>([]);

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('taskpilot-session-'));
      if (!keys.length) return;
      const parsed = JSON.parse(localStorage.getItem(keys[0]) || '{}');
      const sid = parsed?.session?.id;
      const workflow = parsed?.session?.workflow_id || 'taskpilot-mvp-build';
      if (sid) setDynamicCommands([{ label: 'Continue Latest Session', href: `/session/${workflow}?sid=${encodeURIComponent(sid)}` }]);
    } catch {
      // ignore
    }
  }, [open]);

  const filtered = useMemo(
    () => [...dynamicCommands, ...COMMANDS].filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query, dynamicCommands]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('taskpilot-open-command', onOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('taskpilot-open-command', onOpen as EventListener);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-24" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-xl p-3" onClick={(e) => e.stopPropagation()}>
        <input className="input" autoFocus placeholder="Search commands..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.href}
              className="btn-ghost w-full justify-start text-left"
              onClick={() => {
                setOpen(false);
                router.push(item.href);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
