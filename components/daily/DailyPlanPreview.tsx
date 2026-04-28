'use client';

type Props = { children: React.ReactNode };

export function DailyPlanPreview({ children }: Props) {
  return <div className="grid max-w-full grid-cols-1 gap-4 overflow-x-hidden lg:gap-5 xl:grid-cols-[1.1fr_1fr_1fr]">{children}</div>;
}
