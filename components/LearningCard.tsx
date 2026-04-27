'use client';

import type { LearningCard as LearningCardType } from '@/types/workflow';

export function LearningCard({ lesson }: { lesson: LearningCardType }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm">
      <p className="font-semibold text-white">{lesson.lesson_title}</p>
      <p className="text-slate-400">{lesson.summary}</p>
      <p className="mt-1 text-xs text-amber-200">Mistake: {lesson.mistake_or_blocker}</p>
      <p className="text-xs text-slate-300">Rule: {lesson.principle}</p>
      <p className="text-xs text-slate-300">Next time: {lesson.next_time_action}</p>
    </div>
  );
}

