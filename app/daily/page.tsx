'use client';

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { getDailyStorageKey } from '@/lib/storage';
import type { DailyAIResponse, DailyEvent, DailyOutcome, DailyReport, FocusBlock } from '@/types/workflow';

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  ai?: DailyAIResponse;
}

export default function DailyPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const storageKey = getDailyStorageKey(today);
  const [outcomes, setOutcomes] = useState<DailyOutcome[]>([]);
  const [focus, setFocus] = useState<FocusBlock | null>(null);
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [aiMode, setAiMode] = useState<'openai' | 'mock'>('mock');
  const [syncLabel, setSyncLabel] = useState('Local Mode');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOutcomes(parsed.outcomes || []);
        setFocus(parsed.focus || null);
        setEvents(parsed.events || []);
        setReport(parsed.report || null);
        setMessages(parsed.messages || []);
      }
    } catch {
      // ignore corrupted daily state
    }
    void fetch('/api/health').then((res) => res.json()).then((health) => {
      setAiMode(health?.env?.hasOpenAIKey ? 'openai' : 'mock');
      setSyncLabel(health?.env?.supabaseEnabled ? 'Supabase Sync On' : 'Local Mode');
    }).catch(() => null);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ outcomes, focus, events, report, messages }));
  }, [storageKey, outcomes, focus, events, report, messages]);

  function addOutcome() {
    if (outcomes.length >= 3) return;
    const idx = outcomes.length + 1;
    const now = new Date().toISOString();
    const outcome: DailyOutcome = {
      id: crypto.randomUUID(),
      title: `Outcome ${idx}`,
      why_it_matters: 'Supports TaskPilot MVP execution today.',
      category: 'build',
      priority: idx as 1 | 2 | 3,
      status: 'planned',
      estimated_minutes: 60,
      actual_minutes: 0,
      proof_required: 'Commit, screenshot, or test output',
      proof_provided: '',
      created_at: now,
      updated_at: now,
      completed_at: null
    };
    setOutcomes((prev) => [...prev, outcome]);
    setEvents((prev) => [{ id: crypto.randomUUID(), type: 'created_outcome', content: `Created ${outcome.title}`, created_at: now }, ...prev]);
  }

  function startFocus(outcome: DailyOutcome, minutes = 25) {
    const now = new Date().toISOString();
    setFocus({
      id: crypto.randomUUID(),
      outcome_id: outcome.id,
      title: outcome.title,
      status: 'active',
      started_at: now,
      ended_at: null,
      planned_minutes: minutes,
      actual_minutes: 0,
      current_action: `Execute ${outcome.title}`,
      blocker: '',
      drift_score: 0,
      last_progress_at: now
    });
    setOutcomes((prev) => prev.map((item) => (item.id === outcome.id ? { ...item, status: 'active', updated_at: now } : item)));
    setEvents((prev) => [{ id: crypto.randomUUID(), type: 'started_focus', content: `Started focus on ${outcome.title}`, created_at: now }, ...prev]);
  }

  async function sendCoachMessage(prompt: string) {
    const content = prompt || input;
    if (!content.trim()) return;
    setInput('');
    const userMsg: CoachMessage = { id: crypto.randomUUID(), role: 'user', content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    const res = await fetch('/api/daily/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, outcomes, focus, events, report })
    });
    const payload = await res.json();
    const ai: DailyAIResponse = payload?.data;
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: ai?.direct_answer || 'Focus on one action now.',
      created_at: new Date().toISOString(),
      ai
    }]);
  }

  function generateReport() {
    const completed = outcomes.filter((o) => o.status === 'done');
    const blocked = outcomes.filter((o) => o.status === 'blocked');
    const skipped = outcomes.filter((o) => o.status === 'skipped');
    const totalFocusMinutes = outcomes.reduce((sum, item) => sum + item.actual_minutes, 0);
    const dailyReport: DailyReport = {
      id: crypto.randomUUID(),
      date: today,
      completed_outcomes: completed,
      blocked_outcomes: blocked,
      skipped_outcomes: skipped,
      total_focus_minutes: totalFocusMinutes,
      summary: `Completed ${completed.length} outcomes with ${totalFocusMinutes} focused minutes.`,
      wins: completed.map((o) => o.title),
      leaks: blocked.map((o) => o.title),
      tomorrow_first_action: 'Start with the highest-leverage blocked item.',
      money_score: Math.min(10, completed.filter((o) => o.category === 'money').length * 3 + 4),
      execution_score: Math.min(10, completed.length * 3 + 2),
      created_at: new Date().toISOString()
    };
    setReport(dailyReport);
    setEvents((prev) => [{ id: crypto.randomUUID(), type: 'report_generated', content: 'Generated daily report', created_at: new Date().toISOString() }, ...prev]);
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge mb-2">Daily Command Center</p>
            <h1 className="text-3xl font-black">Daily Productivity Mode</h1>
            <p className="mt-1 text-slate-400">{today}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge">AI: {aiMode === 'openai' ? 'OpenAI' : 'Mock'}</span>
            <span className="badge">{syncLabel}</span>
            <button
              className="btn-secondary text-xs"
              onClick={() => {
                if (!window.confirm('Reset today and clear outcomes, focus, events, and report?')) return;
                setOutcomes([]);
                setFocus(null);
                setEvents([]);
                setReport(null);
                setMessages([]);
              }}
            >
              Reset Today
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <div className="card p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Top 3 Outcomes</h2>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm" onClick={() => void sendCoachMessage('Generate today top 3 outcomes for building TaskPilot and shipping MVP.')}>Generate Today&apos;s Top 3 With AI</button>
                  <button className="btn-secondary text-sm" onClick={addOutcome}>Add outcome</button>
                </div>
              </div>
              <div className="grid gap-3">
                {outcomes.map((outcome) => (
                  <div key={outcome.id} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                    <p className="font-semibold text-white">{outcome.title}</p>
                    <p className="text-sm text-slate-400">{outcome.why_it_matters}</p>
                    <p className="text-xs text-slate-500">Priority {outcome.priority} · {outcome.category} · {outcome.status}</p>
                    <p className="text-xs text-slate-500">Est {outcome.estimated_minutes}m · Actual {outcome.actual_minutes}m</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button className="btn-secondary text-xs" onClick={() => startFocus(outcome, 25)}>Start Focus</button>
                      <button className="btn-secondary text-xs" onClick={() => setOutcomes((prev) => prev.map((item) => item.id === outcome.id ? { ...item, status: 'done', completed_at: new Date().toISOString() } : item))}>Mark Done</button>
                      <button className="btn-secondary text-xs" onClick={() => setOutcomes((prev) => prev.map((item) => item.id === outcome.id ? { ...item, status: 'blocked' } : item))}>Mark Blocked</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Active Focus Block</h2>
              {focus ? (
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Outcome:</span> {focus.title}</p>
                  <p><span className="text-slate-500">Current action:</span> {focus.current_action}</p>
                  <p><span className="text-slate-500">Planned minutes:</span> {focus.planned_minutes}</p>
                  <p><span className="text-slate-500">Drift score:</span> {focus.drift_score}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary text-xs" onClick={() => setFocus((prev) => prev ? { ...prev, status: 'paused' } : prev)}>Pause</button>
                    <button className="btn-secondary text-xs" onClick={() => setFocus((prev) => prev ? { ...prev, status: 'complete', ended_at: new Date().toISOString() } : prev)}>Complete action</button>
                    <button className="btn-secondary text-xs" onClick={() => setFocus((prev) => prev ? { ...prev, status: 'blocked', blocker: 'Needs help' } : prev)}>I&apos;m blocked</button>
                    <button className="btn-secondary text-xs" onClick={() => void sendCoachMessage('Based on this active focus block, what should I do next right now?')}>Ask TaskPilot what next</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary text-sm" onClick={() => outcomes[0] && startFocus(outcomes[0], 25)}>Start 25-min focus</button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="card flex h-[520px] sm:h-[620px] flex-col p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">TaskPilot Coach</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <button className="btn-secondary text-xs" onClick={() => void sendCoachMessage('What should I do first today?')}>What should I do first?</button>
                <button className="btn-secondary text-xs" onClick={() => void sendCoachMessage('Reduce this to 5 minutes.')}>Reduce this to 5 minutes</button>
                <button className="btn-secondary text-xs" onClick={() => void sendCoachMessage('I am stuck.')}>I&apos;m stuck</button>
                <button className="btn-secondary text-xs" onClick={() => void sendCoachMessage('Call out my drift.')}>Call out my drift</button>
                <button className="btn-secondary text-xs" onClick={() => void sendCoachMessage('What makes money today?')}>What makes money today?</button>
                <button className="btn-secondary text-xs" onClick={generateReport}>Generate end-of-day report</button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`rounded-xl p-2 text-sm ${m.role === 'assistant' ? 'bg-slate-800/80 text-slate-100' : 'bg-amber-400/10 text-amber-100'}`}>
                    <p className="text-xs uppercase tracking-widest text-slate-500">{m.role}</p>
                    <p>{m.content}</p>
                    {m.ai && (
                      <p className="mt-1 text-xs text-slate-400">Next: {m.ai.next_action} · Focus: {m.ai.suggested_focus_minutes}m</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for coaching..." onKeyDown={(e) => e.key === 'Enter' && void sendCoachMessage('')} />
                <button className="btn-primary" onClick={() => void sendCoachMessage('')}>Send</button>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Progress Timeline</h2>
              <div className="space-y-1 text-sm text-slate-300">
                {events.map((event) => <p key={event.id}>{event.content}</p>)}
                {!events.length && <p className="text-slate-500">No events yet.</p>}
              </div>
            </div>

            {report && (
              <div className="card p-5">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">End-of-Day Report</h2>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Summary:</span> {report.summary}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Wins:</span> {report.wins.join(', ') || 'none'}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Leaks:</span> {report.leaks.join(', ') || 'none'}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Tomorrow first action:</span> {report.tomorrow_first_action}</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Money score:</span> {report.money_score}/10</p>
                <p className="text-sm text-slate-300"><span className="text-slate-500">Execution score:</span> {report.execution_score}/10</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
