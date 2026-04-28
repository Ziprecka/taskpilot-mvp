'use client';

type Props = { children: React.ReactNode };

export function TodayMissionQueue({ children }: Props) {
  return <div className="card max-w-full overflow-hidden p-4 sm:p-5">{children}</div>;
}
