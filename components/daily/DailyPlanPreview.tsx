'use client';

type Props = { children: React.ReactNode };

export function DailyPlanPreview({ children }: Props) {
  return <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">{children}</div>;
}
