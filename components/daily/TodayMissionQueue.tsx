'use client';

type Props = { children: React.ReactNode };

export function TodayMissionQueue({ children }: Props) {
  return <div className="card p-5">{children}</div>;
}
