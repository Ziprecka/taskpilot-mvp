'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Command = { label: string; href: string };
type ActionCommand = { label: string; action: string };

const COMMANDS: Command[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Daily Mode', href: '/daily' },
  { label: 'Plan Today', href: '/daily' },
  { label: 'Start Focus Block', href: '/daily' },
  { label: 'Log Proof', href: '/daily' },
  { label: 'Close the Day', href: '/daily' },
  { label: 'Save Lesson', href: '/daily' },
  { label: 'Improve this page', href: '/daily' },
  { label: 'Generate Workflow', href: '/workflows/generate' },
  { label: 'Open Workflow Library', href: '/workflows/saved' },
  { label: 'Open Saved Sessions', href: '/sessions' },
  { label: 'Open Reports', href: '/reports' },
  { label: 'Open Evidence Vault', href: '/proof' },
  { label: 'Show Weekly Progress', href: '/reports' },
  { label: 'Start New Workflow', href: '/workflows/new' },
  { label: 'Demo', href: '/demo' },
  { label: 'Open Setup', href: '/settings/setup' },
  { label: 'Deploy', href: '/settings/deploy' },
  { label: 'Mobile', href: '/settings/mobile' },
  { label: 'Robot API', href: '/settings/robot' },
  { label: 'Open Feedback', href: '/feedback' },
  { label: 'Account', href: '/account' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Logout', href: '/logout' }
];

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dynamicCommands, setDynamicCommands] = useState<Command[]>([]);
  const [contextActions, setContextActions] = useState<ActionCommand[]>([]);

  useEffect(() => {
    if (pathname.startsWith('/daily')) {
      setContextActions([
        { label: 'New Daily Outcome', action: 'daily-add-outcome' },
        { label: 'Plan Today', action: 'daily-plan-today' },
        { label: 'Start Focus', action: 'daily-start-focus' },
        { label: 'Log Proof', action: 'daily-log-proof' },
        { label: 'Close the Day', action: 'daily-generate-report' },
        { label: 'Save Lesson', action: 'daily-save-lesson' }
        ,{ label: 'Improve this page', action: 'daily-improve-page' }
      ]);
      return;
    }
    if (pathname.startsWith('/session/')) {
      setContextActions([
        { label: 'Mark Step Complete', action: 'session-mark-complete' },
        { label: 'Ask AI What Next', action: 'session-ask-what-next' },
        { label: 'Generate Session Report', action: 'session-generate-report' }
      ]);
      return;
    }
    setContextActions([]);
  }, [pathname]);

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
  const filteredActions = useMemo(
    () => contextActions.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query, contextActions]
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
          {filteredActions.map((item) => (
            <button
              key={item.action}
              className="btn-secondary btn-sm w-full justify-start text-left"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent(item.action));
              }}
            >
              {item.label}
            </button>
          ))}
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
