'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AIMessageCard } from '@/components/AIMessageCard';
import { clampMessages, sessionStorageKey } from '@/lib/storage';
import { loadMessagesFromSupabase, saveMessage } from '@/lib/sessionPersistence';
import type { AIResponse, ChatMessage, SessionNote, SessionUpload, Workflow, WorkflowSession } from '@/types/workflow';

type PartialAIResponse = Partial<AIResponse> | null | undefined;

export function AIChatPanel({
  workflow,
  session,
  uploads,
  notes,
  latestAIResponse,
  systemNotice,
  queuedPrompt,
  onQueuedPromptHandled,
  onMarkStepCompleteFromAI,
  onMessageCountChange,
  onMessagesChange,
  onAIUpdate
}: {
  workflow: Workflow;
  session: WorkflowSession;
  uploads: SessionUpload[];
  notes: SessionNote[];
  latestAIResponse?: PartialAIResponse;
  systemNotice?: string;
  queuedPrompt?: string | null;
  onQueuedPromptHandled?: () => void;
  onMarkStepCompleteFromAI?: () => void;
  onMessageCountChange?: (count: number) => void;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  onAIUpdate: (response: PartialAIResponse) => void;
}) {
  const storageKey = useMemo(() => `${sessionStorageKey(session.id)}-messages`, [session.id]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [env, setEnv] = useState<{ supabaseEnabled?: boolean } | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setMessages(parsed as ChatMessage[]);
    } catch {
      // Ignore invalid localStorage payloads.
    }
  }, [storageKey]);

  useEffect(() => {
    void fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setEnv(data?.env ?? null))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!env?.supabaseEnabled) return;
    void loadMessagesFromSupabase(session.id).then((payload) => {
      const rows = payload?.data;
      if (!Array.isArray(rows) || !rows.length) return;
      const mapped = rows.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        created_at: row.created_at,
        ai_response: row.ai_response ?? undefined
      })) as ChatMessage[];
      setMessages(mapped);
      if (process.env.NODE_ENV !== 'production') console.log('[TaskPilot][persist] session restored source: supabase');
    }).catch(() => null);
  }, [env?.supabaseEnabled, session.id]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(clampMessages(messages)));
    onMessageCountChange?.(messages.length);
    onMessagesChange?.(messages);
  }, [messages, storageKey]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!systemNotice) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: systemNotice, created_at: new Date().toISOString() }]);
  }, [systemNotice]);

  useEffect(() => {
    if (!queuedPrompt) return;
    void sendMessage(queuedPrompt);
    onQueuedPromptHandled?.();
  }, [queuedPrompt]);

  async function sendMessage(messageOverride?: string) {
    const content = messageOverride ?? input;
    if (!content.trim()) return;
    setInput('');
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    if (env?.supabaseEnabled) void saveMessage(session.id, { role: 'user', content, created_at: userMessage.created_at });
    setLoading(true);
    try {
      const isCheckRequest = content.toLowerCase().includes('check');
      if (isCheckRequest && uploads.length === 0 && notes.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'I need proof to check. Upload a screenshot/photo or add notes first.',
            created_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          mode: session.mode,
          goal: session.goal,
          workflow,
          session,
          currentStep: session.current_step,
          allSteps: workflow.steps,
          completedSteps: session.completed_steps,
          notes,
          uploads,
          contextNotes: notes.map((n) => n.content),
          recentMessages: messages.slice(-8)
        })
      });
      const raw = await res.json();
      const currentStepInstructions =
        workflow.steps.find((step) => step.step_number === session.current_step)?.instructions ??
        'Continue with the current step.';
      const data: AIResponse = {
        workflow_state: {
          goal: raw?.workflow_state?.goal ?? session.goal,
          category: raw?.workflow_state?.category ?? workflow.category,
          mode: raw?.workflow_state?.mode ?? session.mode,
          current_step: raw?.workflow_state?.current_step ?? session.current_step,
          completed_steps: Array.isArray(raw?.workflow_state?.completed_steps)
            ? raw.workflow_state.completed_steps
            : session.completed_steps,
          confidence: raw?.workflow_state?.confidence ?? session.confidence,
          is_complete: Boolean(raw?.workflow_state?.is_complete)
        },
        user_facing_response:
          raw?.user_facing_response ??
          'TaskPilot could not generate a response right now. Try again in a moment.',
        direct_answer: raw?.direct_answer ?? raw?.user_facing_response ?? '',
        next_action: raw?.next_action ?? currentStepInstructions,
        needs_input: Boolean(raw?.needs_input),
        requested_input: raw?.requested_input ?? '',
        detected_issues: Array.isArray(raw?.detected_issues) ? raw.detected_issues : [],
        updated_steps: Array.isArray(raw?.updated_steps) ? raw.updated_steps : [],
        ai_source: raw?.ai_source === 'openai' ? 'openai' : 'mock',
        intent: raw?.intent ?? 'general',
        completion: {
          workflow_complete: Boolean(raw?.completion?.workflow_complete),
          completion_summary: raw?.completion?.completion_summary ?? '',
          completed_at: raw?.completion?.completed_at ?? null,
          recommended_next_workflow: raw?.completion?.recommended_next_workflow ?? 'taskpilot-mvp-build'
        },
        proof_result: {
          has_proof: Boolean(raw?.proof_result?.has_proof),
          proof_sufficient: Boolean(raw?.proof_result?.proof_sufficient),
          should_mark_complete: Boolean(raw?.proof_result?.should_mark_complete),
          proof_summary: raw?.proof_result?.proof_summary ?? ''
        }
      };

      onAIUpdate(data);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.direct_answer || data.user_facing_response,
          created_at: new Date().toISOString(),
          ai_response: data
        }
      ]);
      if (env?.supabaseEnabled) {
        void saveMessage(session.id, {
          role: 'assistant',
          content: data.direct_answer || data.user_facing_response,
          ai_response: data,
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Something broke in the AI route. Check your terminal and .env file.', created_at: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-hover flex h-[calc(100vh-170px)] min-h-[620px] max-h-[780px] flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">AI Copilot</h2>
        <div className="flex gap-2">
          {process.env.NODE_ENV !== 'production' && (
            <button className="btn-ghost btn-sm" onClick={() => setMessages([])}>Clear</button>
          )}
          <span className={`badge ${latestAIResponse?.ai_source === 'openai' ? '' : 'border-amber-400/60 text-amber-200'}`}>
            AI: {latestAIResponse?.ai_source === 'openai' ? 'OpenAI' : 'Mock Mode'}
          </span>
        </div>
      </div>
      {latestAIResponse?.ai_source !== 'openai' && uploads.length > 0 && (
        <p className="mb-3 text-xs text-amber-300">Mock Mode cannot truly inspect images. Add OPENAI_API_KEY to enable visual checking.</p>
      )}
      <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2">
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => sendMessage('Based on the current workflow state, give me the single highest leverage next action. Mention the exact file, feature, or setup task if known.')}>What next?</button>
          <button className="btn-ghost btn-sm" onClick={() => sendMessage('Explain the current step in plain language. Include what I need to build, why it matters, what file or feature is involved, and the exact next action.')}>Explain</button>
          <button className="btn-ghost btn-sm" onClick={() => sendMessage('I am blocked. Debug this blocker. Ask for exact logs if missing and give one first fix.')}>Debug</button>
          <button className="btn-ghost btn-sm" onClick={() => sendMessage('check my work using latest proof')}>Check proof</button>
          <button className="btn-ghost btn-sm" onClick={() => sendMessage('Generate a structured progress report for this session.')}>Report</button>
        </div>
      </div>
      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-xl p-3 text-sm ${m.role === 'assistant' ? 'bg-slate-800/80 text-slate-100' : 'bg-amber-400/15 text-amber-100'}`}>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">{m.role}</p>
            {m.role === 'assistant' ? <AIMessageCard messageId={m.id} sessionId={session.id} content={m.content} meta={{ aiResponse: m.ai_response }} onMarkStepComplete={onMarkStepCompleteFromAI} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
          </div>
        ))}
        {loading && <p className="text-sm text-slate-400">TaskPilot is thinking...</p>}
        {!messages.length && !loading && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
            <p className="font-semibold text-white">No messages yet</p>
            <p className="mt-1">Ask for the next action, request a debug path, or check proof to begin.</p>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 mt-3 border-t border-slate-800 bg-slate-950/65 pt-3 backdrop-blur">
        <div className="flex gap-2">
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask what next, paste error, or describe what you see..." onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
          <button className="btn-primary" onClick={() => sendMessage()}>Send</button>
        </div>
      </div>
    </div>
  );
}
