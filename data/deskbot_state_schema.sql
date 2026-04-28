create table if not exists public.daily_robot_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  robot_id text not null,
  day_key text not null,
  status text not null,
  source text not null,
  mission_id text,
  mission_title text,
  mission_short_title text,
  next_move text,
  proof_needed text,
  button_hint text default 'Press = check in',
  updated_at timestamptz not null default now(),
  unique(user_id, robot_id, day_key)
);

create index if not exists idx_daily_robot_state_user_day on public.daily_robot_state(user_id, day_key);
create index if not exists idx_daily_robot_state_robot_day on public.daily_robot_state(robot_id, day_key);
