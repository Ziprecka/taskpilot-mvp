-- TaskPilot MVP schema for local-dev persistence.
-- Run this in Supabase SQL Editor, then run supabase/seed.sql.
-- Production auth and RLS policies are TODO for later.
-- Quick test after running:
-- select * from public.workflows where slug = 'taskpilot-mvp-build';

create extension if not exists "pgcrypto";

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  slug text unique,
  name text not null,
  category text not null,
  difficulty text,
  goal text,
  description text,
  estimated_time text,
  required_tools jsonb default '[]'::jsonb,
  required_materials jsonb default '[]'::jsonb,
  source text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows(id) on delete cascade,
  step_number int not null,
  title text not null,
  instructions text,
  expected_state text,
  common_mistakes jsonb default '[]'::jsonb,
  visual_checks jsonb default '[]'::jsonb,
  completion_criteria text,
  created_at timestamptz default now()
);

create table if not exists public.workflow_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  workflow_id uuid references public.workflows(id) on delete set null,
  workflow_slug text,
  goal text,
  mode text default 'guide',
  status text default 'active',
  current_step int default 1,
  completed_steps jsonb default '[]'::jsonb,
  detected_issues jsonb default '[]'::jsonb,
  ai_next_action text,
  ai_source text default 'mock',
  confidence text default 'medium',
  started_at timestamptz default now(),
  completed_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.workflow_sessions(id) on delete cascade,
  event_type text not null,
  content text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  session_id uuid references public.workflow_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  ai_response jsonb,
  created_at timestamptz default now()
);

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  session_id uuid references public.workflow_sessions(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.session_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  session_id uuid references public.workflow_sessions(id) on delete cascade,
  name text not null,
  type text not null,
  size int,
  storage_path text,
  public_url text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  session_id uuid references public.workflow_sessions(id) on delete cascade,
  workflow_name text,
  goal text,
  summary text,
  completed_steps jsonb default '[]'::jsonb,
  issues_found jsonb default '[]'::jsonb,
  next_recommendations jsonb default '[]'::jsonb,
  report jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_workflows_user_id on public.workflows(user_id);
create index if not exists idx_workflow_steps_workflow_id on public.workflow_steps(workflow_id);
create index if not exists idx_sessions_user_id on public.workflow_sessions(user_id);
create index if not exists idx_session_events_session_id on public.session_events(session_id);
create index if not exists idx_ai_messages_session_id on public.ai_messages(session_id);
create index if not exists idx_session_notes_session_id on public.session_notes(session_id);
create index if not exists idx_session_uploads_session_id on public.session_uploads(session_id);
create index if not exists idx_reports_session_id on public.reports(session_id);

create table if not exists public.daily_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  date date not null default current_date,
  title text not null,
  why_it_matters text,
  category text default 'other',
  priority int default 1,
  status text default 'planned',
  estimated_minutes int default 25,
  actual_minutes int default 0,
  proof_required text,
  proof_provided text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.daily_focus_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  outcome_id uuid references public.daily_outcomes(id) on delete cascade,
  title text not null,
  status text default 'active',
  started_at timestamptz default now(),
  ended_at timestamptz,
  planned_minutes int default 25,
  actual_minutes int default 0,
  current_action text,
  blocker text,
  drift_score int default 0,
  last_progress_at timestamptz default now()
);

create table if not exists public.daily_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  outcome_id uuid references public.daily_outcomes(id) on delete cascade,
  focus_block_id uuid references public.daily_focus_blocks(id) on delete set null,
  event_type text not null,
  content text,
  created_at timestamptz default now()
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  date date not null default current_date,
  completed_outcomes jsonb default '[]'::jsonb,
  blocked_outcomes jsonb default '[]'::jsonb,
  skipped_outcomes jsonb default '[]'::jsonb,
  total_focus_minutes int default 0,
  summary text,
  wins jsonb default '[]'::jsonb,
  leaks jsonb default '[]'::jsonb,
  tomorrow_first_action text,
  money_score int default 0,
  execution_score int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_daily_outcomes_user_date on public.daily_outcomes(user_id, date);
create index if not exists idx_daily_focus_blocks_user on public.daily_focus_blocks(user_id);
create index if not exists idx_daily_events_user on public.daily_events(user_id);
create index if not exists idx_daily_reports_user_date on public.daily_reports(user_id, date);

create table if not exists public.robot_devices (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  robot_id text unique not null,
  name text not null,
  device_type text not null,
  capabilities jsonb default '{}'::jsonb,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.robot_states (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  robot_id text not null,
  status text default 'idle',
  active_session_id text,
  active_daily_focus_id text,
  current_task text,
  current_step text,
  next_action text,
  proof_needed text,
  drift_risk text default 'low',
  last_progress_minutes_ago int default 0,
  ai_message text,
  updated_at timestamptz default now()
);

create table if not exists public.robot_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  robot_id text not null,
  event_type text not null,
  content text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.robot_commands (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  robot_id text not null,
  type text not null,
  message text,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_robot_devices_robot_id on public.robot_devices(robot_id);
create index if not exists idx_robot_states_robot_id on public.robot_states(robot_id);
create index if not exists idx_robot_events_robot_id on public.robot_events(robot_id);
create index if not exists idx_robot_commands_robot_id_status on public.robot_commands(robot_id, status);

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  type text,
  severity text,
  area text,
  description text,
  expected_behavior text,
  proof_url text,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_message_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'local-dev-user',
  message_id text not null,
  session_id text,
  rating text not null,
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_feedback_items_status on public.feedback_items(status);
create index if not exists idx_ai_message_feedback_message on public.ai_message_feedback(message_id);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free',
  subscription_status text default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_plan on public.profiles(plan);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_usage_events_user on public.usage_events(user_id);
create index if not exists idx_usage_events_type on public.usage_events(event_type);

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
-- TODO: Add additional RLS policies for other tables before GA.
