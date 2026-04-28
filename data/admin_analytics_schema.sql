alter table public.profiles
add column if not exists source text,
add column if not exists ref text,
add column if not exists utm_source text,
add column if not exists utm_medium text,
add column if not exists utm_campaign text,
add column if not exists utm_content text,
add column if not exists x_handle text,
add column if not exists last_active_at timestamptz,
add column if not exists admin_notes text,
add column if not exists contact_status text default 'new';

create table if not exists public.admin_user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  contact_status text default 'new',
  feedback_summary text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_user_notes_user_id on public.admin_user_notes(user_id);
