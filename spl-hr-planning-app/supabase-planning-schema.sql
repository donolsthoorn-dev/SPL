-- Planning-datamodel + RLS (voer uit in Supabase SQL Editor na supabase-schema.sql)

create extension if not exists "pgcrypto";

-- Voorkomt RLS-recursie: controleert admin_users met rechten van functie-eigenaar
create or replace function public.is_planning_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_planning_admin() from public;
grant execute on function public.is_planning_admin() to authenticated;

create table if not exists public.spl_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text not null,
  email text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.spl_location_periods (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.spl_locations (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  slots jsonb not null,
  sort_order int not null default 0
);

create table if not exists public.spl_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  contract_type text not null check (contract_type in ('Vast', 'OproepKracht')),
  week_hours numeric not null,
  end_date date,
  days int[] not null,
  preferred_location_ids uuid[] not null default '{}',
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.spl_employees
  add column if not exists email text;

create table if not exists public.spl_employee_absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.spl_employees (id) on delete cascade,
  absence_date date not null,
  reason text not null default 'Ziek',
  unique (employee_id, absence_date)
);

create table if not exists public.spl_planning_weeks (
  week_start date primary key,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.spl_planning_assignments (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  location_id uuid not null references public.spl_locations (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  day_part text not null check (day_part in ('ochtend', 'middag')),
  employee_id uuid not null references public.spl_employees (id) on delete cascade,
  unique (week_start, location_id, weekday, day_part, employee_id)
);

create index if not exists spl_planning_assignments_week_idx
  on public.spl_planning_assignments (week_start);

alter table public.spl_locations enable row level security;
alter table public.spl_location_periods enable row level security;
alter table public.spl_employees enable row level security;
alter table public.spl_employee_absences enable row level security;
alter table public.spl_planning_weeks enable row level security;
alter table public.spl_planning_assignments enable row level security;

create policy "spl_locations admin"
on public.spl_locations for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_location_periods admin"
on public.spl_location_periods for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_employees admin"
on public.spl_employees for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_employee_absences admin"
on public.spl_employee_absences for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_planning_weeks admin"
on public.spl_planning_weeks for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_planning_assignments admin"
on public.spl_planning_assignments for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());
