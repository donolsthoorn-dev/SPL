create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  title text not null,
  notes text,
  published boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.weekly_plans enable row level security;

-- Geen self-join op admin_users: anders kan RLS de inner query leeg houden
-- en ziet de app je admin-rij niet (altijd "Geen admin toegang").
create policy "Users read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can manage weekly_plans"
on public.weekly_plans
for all
to authenticated
using (exists (
  select 1 from public.admin_users au where au.user_id = auth.uid()
))
with check (exists (
  select 1 from public.admin_users au where au.user_id = auth.uid()
));
