'use client';

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { addRecentActivity } from '@/lib/activity';
import { getDailyStorageKey } from '@/lib/storage';
import type { DailyAIResponse, DailyEvent, DailyOutcome, DailyReport, FocusBlock } from '@/types/workflow';

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  ai?: DailyAIResponse;
}

type DayType = 'build' | 'money' | 'admin' | 'learning' | 'personal' | 'custom';
type DailyTab = 'outcomes' | 'focus' | 'coach' | 'timeline' | 'report';

const OUTCOME_TEMPLATES: Record<DayType, string[]> = {
  build: ['Ship one scoped improvement', 'Fix highest-visibility UX issue', 'Record proof/demo of progress'],
  money: ['Send 10 targeted outreach messages', 'Create one sales asset', 'Follow up with 3 warm leads'],
  admin: ['Clear highest-risk overdue task', 'Organize one recurring system', 'Document one SOP'],
  learning: ['Complete one learning sprint with proof', 'Apply one new skill in practice', 'Summarize learning into notes'],
  personal: ['Finish one meaningful personal task', 'Protect one focus block', 'Close one open loop'],
  custom: ['Define one high-impact outcome', 'Break it into one executable action', 'Capture proof by day end']
};

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
  const [syncLabel, setSyncLabel] = useState('Local');
  const [mobileTab, setMobileTab] = useState<DailyTab>('outcomes');
  const [dayType, setDayType] = useState<DayType>('personal');
  const [customDirection, setCustomDirection] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [focusNow, setFocusNow] = useState<number>(0);
  const [proofInput, setProofInput] = useState('');
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingWhy, setEditingWhy] = useState('');

  const dailyState = focus?.status === 'blocked' ? 'Blocked' : focus?.status === 'active' ? 'Focus mode' : outcomes.length ? 'Planning' : 'Planning';

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
        setDayType(parsed.dayType || 'personal');
        setCustomDirection(parsed.customDirection || '');
      }
    } catch {
      // ignore corrupted daily state
    }
    try {
      const prefsRaw = localStorage.getItem('taskpilot-user-preferences');
      const prefs = prefsRaw ? JSON.parse(prefsRaw) : null;
      if (prefs?.primary_use_case?.includes('business')) setDayType('money');
      else if (prefs?.primary_use_case?.includes('learning')) setDayType('learning');
      else if (prefs?.primary_use_case?.includes('coding')) setDayType('build');
    } catch {
      // ignore preference parse errors
    }
    void fetch('/api/health').then((res) => res.json()).then((health) => {
      setAiMode(health?.env?.hasOpenAIKey ? 'openai' : 'mock');
      setSyncLabel(health?.env?.supabaseEnabled ? 'Synced' : 'Local');
    }).catch(() => null);
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ outcomes, focus, events, report, messages, dayType, customDirection }));
  }, [storageKey, outcomes, focus, events, report, messages, dayType, customDirection]);

  useEffect(() => {
    if (!focus || focus.status !== 'active') return;
    const timer = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(focus.started_at).getTime()) / 60000));
      setFocusNow(elapsed);
      setFocus((prev) => prev ? { ...prev, actual_minutes: elapsed, last_progress_at: new Date().toISOString() } : prev);
    }, 15000);
    return () => clearInterval(timer);
  }, [focus?.id, focus?.status, focus?.started_at]);

  function logEvent(type: DailyEvent['type'], content: string) {
    const event = { id: crypto.randomUUID(), type, content, created_at: new Date().toISOString() };
    setEvents((prev) => [event, ...prev].slice(0, 120));
  }

  function addOutcomeFromTemplate(title: string, idx: number) {
    const now = new Date().toISOString();
    const outcome: DailyOutcome = {
      id: crypto.randomUUID(),
      title,
      why_it_matters: 'This creates visible progress by end of day.',
      category: dayType === 'money' ? 'money' : dayType === 'admin' ? 'admin' : dayType === 'learning' ? 'learning' : 'build',
      priority: Math.min(3, idx + 1) as 1 | 2 | 3,
      status: 'planned',
      estimated_minutes: 60,
      actual_minutes: 0,
      proof_required: 'Proof of progress by day end',
      proof_provided: '',
      created_at: now,
      updated_at: now,
      completed_at: null
    };
    setOutcomes((prev) => [...prev, outcome].slice(0, 3));
    logEvent('created_outcome', `Created outcome: ${title}`);
    addRecentActivity({ type: 'daily_outcome_created', title: title, route: '/daily' });
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
      current_action: `Start: ${outcome.title}`,
      blocker: '',
      drift_score: 0,
      last_progress_at: now
    });
    setOutcomes((prev) => prev.map((item) => (item.id === outcome.id ? { ...item, status: 'active', updated_at: now } : item)));
    logEvent('started_focus', `Started focus on ${outcome.title}`);
    addRecentActivity({ type: 'focus_started', title: `Focus: ${outcome.title}`, route: '/daily' });
  }

  async function sendCoachMessage(prompt: string) {
    const content = prompt || input;
    if (!content.trim()) return;
    setInput('');
    const userMsg: CoachMessage = { id: crypto.randomUUID(), role: 'user', content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    logEvent('coach_message_sent', `Coach asked: ${content.slice(0, 40)}...`);
    addRecentActivity({ type: 'coach_message_sent', title: 'Sent message to Daily Copilot', route: '/daily' });
    const res = await fetch('/api/daily/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, outcomes, focus, events, report, dayType, customDirection })
    });
    const payload = await res.json();
    const ai: DailyAIResponse = payload?.data;
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: ai?.direct_answer || 'Pick one high-leverage action and start now.',
      created_at: new Date().toISOString(),
      ai
    }]);
  }

  async function planTodayWithAI() {
    const prompt = `Plan my top 3 outcomes for today. Day type: ${dayType}. Context: ${customDirection || 'none'}.`;
    const res = await fetch('/api/daily/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: prompt, outcomes, focus, events, report, dayType, customDirection, generateTop3: true }) });
    const payload = await res.json();
    const generated = Array.isArray(payload?.data?.generated_outcomes) ? payload.data.generated_outcomes : OUTCOME_TEMPLATES[dayType];
    setOutcomes([]);
    generated.slice(0, 3).forEach((title: string, idx: number) => addOutcomeFromTemplate(title, idx));
    logEvent('generated_top3', `Planned top 3 outcomes for a ${dayType} day.`);
  }

  function completeOutcome(outcomeId: string) {
    const now = new Date().toISOString();
    setOutcomes((prev) => prev.map((item) => (item.id === outcomeId ? { ...item, status: 'done', completed_at: now, updated_at: now } : item)));
    logEvent('completed_outcome', 'Marked an outcome done.');
    addRecentActivity({ type: 'daily_outcome_completed', title: 'Completed a daily outcome', route: '/daily' });
  }

  function markBlocked(outcomeId: string) {
    setOutcomes((prev) => prev.map((item) => (item.id === outcomeId ? { ...item, status: 'blocked', updated_at: new Date().toISOString() } : item)));
    logEvent('blocked', 'Marked outcome blocked.');
  }

  function generateReport() {
    const completed = outcomes.filter((o) => o.status === 'done');
    const blocked = outcomes.filter((o) => o.status === 'blocked');
    const skipped = outcomes.filter((o) => o.status === 'skipped');
    const unfinished = outcomes.filter((o) => o.status !== 'done').map((o) => o.title);
    const totalFocusMinutes = focus?.actual_minutes || outcomes.reduce((sum, item) => sum + item.actual_minutes, 0);
    const dailyReport: DailyReport = {
      id: crypto.randomUUID(),
      date: today,
      completed_outcomes: completed,
      blocked_outcomes: blocked,
      skipped_outcomes: skipped,
      total_focus_minutes: totalFocusMinutes,
      summary: `Completed ${completed.length}/${outcomes.length} planned outcomes.`,
      wins: completed.map((o) => o.title),
      leaks: blocked.map((o) => o.title),
      tomorrow_first_action: unfinished[0] ? `Start with: ${unfinished[0]}` : 'Pick one high-leverage outcome before noon.',
      money_score: Math.min(10, completed.filter((o) => o.category === 'money').length * 4 + 2),
      execution_score: Math.min(10, completed.length * 3 + (totalFocusMinutes >= 50 ? 2 : 0)),
      created_at: new Date().toISOString()
    };
    setReport(dailyReport);
    logEvent('report_generated', 'Generated end-of-day report.');
    addRecentActivity({ type: 'daily_report_generated', title: 'Generated end-of-day report', route: '/daily' });
  }

  const highestLeverage = outcomes.find((o) => o.status === 'active') || outcomes.find((o) => o.status === 'planned');

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge mb-2">Today&apos;s execution cockpit</p>
            <h1 className="text-3xl font-black">Daily Command Center</h1>
            <p className="mt-1 text-sm text-slate-400">{today} · Status: {dailyState}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge">AI: {aiMode === 'openai' ? 'OpenAI' : 'Mock'}</span>
            <span className="badge">Sync: {syncLabel}</span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {(['outcomes', 'focus', 'coach', 'timeline', 'report'] as DailyTab[]).map((tab) => (
            <button key={tab} className={`btn-secondary btn-sm ${mobileTab === tab ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setMobileTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
          <div className={`${mobileTab === 'outcomes' ? 'block' : 'hidden'} space-y-5 lg:block`}>
            <div className="card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Today&apos;s top 3 outcomes</h2>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setShowPlanModal(true)}>Plan today with AI</button>
                  <button className="btn-ghost btn-sm" onClick={() => addOutcomeFromTemplate(`Outcome ${outcomes.length + 1}`, outcomes.length)}>Add outcome</button>
                </div>
              </div>
              {!outcomes.length ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">Start by choosing today&apos;s top 3 outcomes.</p>
                  <p className="mt-1 text-sm text-slate-400">Pick outcomes, not chores. A good outcome has a visible result by end of day.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => { setDayType('build'); addOutcomeFromTemplate('Ship one useful improvement', 0); }}>Build something</button>
                    <button className="btn-secondary btn-sm" onClick={() => { setDayType('money'); addOutcomeFromTemplate('Send 10 sales or beta outreach messages', 0); }}>Make money</button>
                    <button className="btn-secondary btn-sm" onClick={() => addOutcomeFromTemplate('Fix the biggest blocker in my current project', 0)}>Clear a blocker</button>
                    <button className="btn-ghost btn-sm" onClick={() => setShowPlanModal(true)}>Start from scratch</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {outcomes.map((outcome) => (
                    <div key={outcome.id} className={`rounded-xl border p-3 ${outcome.status === 'done' ? 'border-emerald-500/40 bg-emerald-400/10' : outcome.status === 'blocked' ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 bg-slate-950/40'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-white">#{outcome.priority} {outcome.title}</p>
                        <span className="badge">{outcome.category}</span>
                      </div>
                      <p className="text-sm text-slate-400">{outcome.why_it_matters}</p>
                      <p className="mt-1 text-xs text-slate-500">Status: {outcome.status} · Est {outcome.estimated_minutes}m · Actual {outcome.actual_minutes}m</p>
                      <p className="text-xs text-slate-500">Proof required: {outcome.proof_required}</p>
                      {outcome.status === 'blocked' && <p className="mt-1 text-xs text-amber-200">Blocked. Resolve blocker or pick smallest unblock step.</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {outcome.status !== 'done' && <button className="btn-primary btn-sm" onClick={() => startFocus(outcome)}>Focus</button>}
                        {outcome.status !== 'done' && <button className="btn-secondary btn-sm" onClick={() => completeOutcome(outcome.id)}>Done</button>}
                        {outcome.status !== 'done' && <button className="btn-ghost btn-sm" onClick={() => markBlocked(outcome.id)}>Blocked</button>}
                        <button className="btn-ghost btn-sm" onClick={() => { setEditingOutcomeId(outcome.id); setEditingTitle(outcome.title); setEditingWhy(outcome.why_it_matters); }}>Edit</button>
                      </div>
                      {outcome.completed_at && <p className="mt-1 text-xs text-emerald-300">Completed {new Date(outcome.completed_at).toLocaleTimeString()}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${mobileTab === 'focus' ? 'block' : 'hidden'} space-y-5 lg:block`}>
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Active Focus</h2>
              {!focus || focus.status !== 'active' ? (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">No focus block running</p>
                  <p className="mt-1 text-sm text-slate-400">Start a focus block from one of today&apos;s outcomes.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => highestLeverage && startFocus(highestLeverage, 25)}>Pick best outcome</button>
                    <button className="btn-primary btn-sm" onClick={() => highestLeverage && startFocus(highestLeverage, 25)}>Start focus block</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Outcome:</span> {focus.title}</p>
                  <p><span className="text-slate-500">Current action:</span> {focus.current_action}</p>
                  <p><span className="text-slate-500">Elapsed:</span> {focusNow}m / {focus.planned_minutes}m</p>
                  <p><span className="text-slate-500">Proof needed:</span> {outcomes.find((o) => o.id === focus.outcome_id)?.proof_required || 'Visible result'}</p>
                  <p><span className="text-slate-500">Drift score:</span> {focus.drift_score}</p>
                  <p><span className="text-slate-500">Last progress:</span> {new Date(focus.last_progress_at).toLocaleTimeString()}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => { setFocus((prev) => prev ? { ...prev, status: 'complete', ended_at: new Date().toISOString() } : prev); logEvent('completed_action', 'Completed focus action.'); }}>Complete action</button>
                    <button className="btn-secondary btn-sm" onClick={() => { const now = new Date().toISOString(); setOutcomes((prev) => prev.map((o) => o.id === focus.outcome_id ? { ...o, proof_provided: proofInput || 'Proof added', updated_at: now } : o)); setProofInput(''); logEvent('proof_added', 'Added proof to active focus.'); }}>Add proof</button>
                    <button className="btn-ghost btn-sm" onClick={() => { setFocus((prev) => prev ? { ...prev, status: 'blocked', blocker: 'Needs help' } : prev); logEvent('blocked', 'Focus block marked blocked.'); }}>I&apos;m blocked</button>
                    <button className="btn-ghost btn-sm" onClick={() => setFocus((prev) => prev ? { ...prev, status: 'paused' } : prev)}>Pause</button>
                    <button className="btn-ghost btn-sm" onClick={() => setFocus(null)}>End focus</button>
                  </div>
                  <input className="input mt-2" placeholder="Paste quick proof note..." value={proofInput} onChange={(e) => setProofInput(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <div className={`${mobileTab === 'coach' ? 'block' : 'hidden'} space-y-5 lg:block`}>
            <div className="card flex h-[520px] sm:h-[620px] flex-col p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Daily Copilot</h2>
              <div className="mb-3 flex flex-wrap gap-2">
                <button className="btn-secondary btn-sm" onClick={() => void sendCoachMessage('Based on today outcomes, choose the highest leverage outcome to work on first. Explain why, then give one next action under 5 minutes.')}>Pick highest leverage</button>
                <button className="btn-ghost btn-sm" onClick={() => void sendCoachMessage('Reduce the active outcome to one tiny action that takes under 5 minutes.')}>Reduce to 5 minutes</button>
                <button className="btn-ghost btn-sm" onClick={() => void sendCoachMessage('I am blocked. Ask me for exact blocker details and give the smallest unblock step.')}>I&apos;m blocked</button>
                <button className="btn-ghost btn-sm" onClick={() => void sendCoachMessage('Find money actions from today outcomes and suggest one immediate action.')}>Find money actions</button>
                <button className="btn-secondary btn-sm" onClick={generateReport}>End-of-day report</button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`rounded-xl p-2 text-sm ${m.role === 'assistant' ? 'bg-slate-800/80 text-slate-100' : 'bg-amber-400/10 text-amber-100'}`}>
                    <p className="text-xs uppercase tracking-widest text-slate-500">{m.role}</p>
                    <p>{m.content}</p>
                    {m.ai && <p className="mt-1 text-xs text-slate-400">Next: {m.ai.next_action} · Focus: {m.ai.focus_minutes ?? m.ai.suggested_focus_minutes}m</p>}
                  </div>
                ))}
                {!messages.length && <p className="text-sm text-slate-500">No coach messages yet. Ask what to do first.</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for coaching..." onKeyDown={(e) => e.key === 'Enter' && void sendCoachMessage('')} />
                <button className="btn-primary" onClick={() => void sendCoachMessage('')}>Send</button>
              </div>
            </div>
          </div>
        </div>

        <div className={`${mobileTab === 'timeline' ? 'block' : 'hidden'} mt-5 lg:block`}>
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">Progress Timeline</h2>
            <div className="space-y-1 text-sm text-slate-300">
              {events.map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleTimeString()} · [{event.type}] {event.content}</p>)}
              {!events.length && <p className="text-slate-500">No progress logged yet. Start a focus block or mark an outcome complete.</p>}
            </div>
          </div>
        </div>

        {(report || mobileTab === 'report') && (
          <div className={`${mobileTab === 'report' ? 'block' : 'hidden'} mt-5 lg:block`}>
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">End-of-Day Report</h2>
              {report ? (
                <>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Summary:</span> {report.summary}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Completed outcomes:</span> {report.completed_outcomes.map((o) => o.title).join(', ') || 'none'}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Blocked outcomes:</span> {report.blocked_outcomes.map((o) => o.title).join(', ') || 'none'}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Focus minutes:</span> {report.total_focus_minutes}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Biggest win:</span> {report.wins[0] || 'n/a'}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Biggest leak:</span> {report.leaks[0] || 'n/a'}</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Money score:</span> {report.money_score}/10</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Execution score:</span> {report.execution_score}/10</p>
                  <p className="text-sm text-slate-300"><span className="text-slate-500">Tomorrow first action:</span> {report.tomorrow_first_action}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}>Copy report</button>
                    <button className="btn-secondary btn-sm" onClick={() => {
                      const nextDay = new Date();
                      nextDay.setDate(nextDay.getDate() + 1);
                      const nextKey = getDailyStorageKey(nextDay.toISOString().slice(0, 10));
                      const carry = outcomes.filter((o) => o.status !== 'done').map((o, idx) => ({ ...o, id: crypto.randomUUID(), priority: Math.min(3, idx + 1) as 1 | 2 | 3, status: 'planned', completed_at: null, updated_at: new Date().toISOString() }));
                      const existingRaw = localStorage.getItem(nextKey);
                      const existing = existingRaw ? JSON.parse(existingRaw) : {};
                      localStorage.setItem(nextKey, JSON.stringify({ ...existing, outcomes: carry }));
                      logEvent('carry_over', `Carried ${carry.length} unfinished outcomes to tomorrow.`);
                    }}>Carry unfinished to tomorrow</button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">No report yet</p>
                  <p className="mt-1 text-sm text-slate-400">Generate your end-of-day report after focus sessions to capture wins and leaks.</p>
                  <button className="btn-primary btn-sm mt-3" onClick={generateReport}>End-of-day report</button>
                </div>
              )}
            </div>
          </div>
        )}

        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setShowPlanModal(false)}>
            <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">What kind of day are you planning?</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['build', 'money', 'admin', 'learning', 'personal', 'custom'] as DayType[]).map((type) => (
                  <button key={type} className={`btn-secondary btn-sm ${dayType === type ? 'border-amber-400 text-amber-200' : ''}`} onClick={() => setDayType(type)}>{type}</button>
                ))}
              </div>
              <textarea className="input mt-3 min-h-24" value={customDirection} onChange={(e) => setCustomDirection(e.target.value)} placeholder="What is on your mind today?" />
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={() => { setShowPlanModal(false); void planTodayWithAI(); }}>Plan today with AI</button>
                <button className="btn-ghost" onClick={() => setShowPlanModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {editingOutcomeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setEditingOutcomeId(null)}>
            <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-black">Edit outcome</h2>
              <input className="input mt-3" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
              <textarea className="input mt-2 min-h-20" value={editingWhy} onChange={(e) => setEditingWhy(e.target.value)} />
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={() => {
                  setOutcomes((prev) => prev.map((o) => o.id === editingOutcomeId ? { ...o, title: editingTitle, why_it_matters: editingWhy, updated_at: new Date().toISOString() } : o));
                  setEditingOutcomeId(null);
                }}>Save</button>
                <button className="btn-ghost" onClick={() => setEditingOutcomeId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
