alter table public.profiles
  add column if not exists work_use text,
  add column if not exists business_name text,
  add column if not exists industry text,
  add column if not exists service_area text,
  add column if not exists offer text,
  add column if not exists target_customer text,
  add column if not exists common_tools text[],
  add column if not exists preferred_tone text,
  add column if not exists booking_link text;

create table if not exists public.user_execution_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_categories text[] default '{}',
  common_tools text[] default '{}',
  proof_preferences text[] default '{}',
  successful_patterns text[] default '{}',
  updated_at timestamptz not null default now()
);
