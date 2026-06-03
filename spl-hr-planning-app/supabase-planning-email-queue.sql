-- E-mailwachtrij + afleverlog voor planning-notificaties (na supabase-planning-schema.sql)

create table if not exists public.spl_planning_email_dispatches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  audience text not null check (audience in ('employee', 'location')),
  mode text not null default 'full' check (mode in ('full', 'catchup')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  skipped_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.spl_planning_email_queue (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.spl_planning_email_dispatches (id) on delete cascade,
  recipient_id uuid not null,
  recipient_name text not null,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dispatch_id, recipient_id)
);

create index if not exists spl_planning_email_queue_dispatch_pending_idx
  on public.spl_planning_email_queue (dispatch_id)
  where status = 'pending';

-- Per medewerker/locatie + week: al succesvol gemaild (voorkomt dubbele mail)
create table if not exists public.spl_planning_email_deliveries (
  week_start date not null,
  audience text not null check (audience in ('employee', 'location')),
  recipient_id uuid not null,
  email text not null,
  dispatch_id uuid references public.spl_planning_email_dispatches (id) on delete set null,
  delivered_at timestamptz not null default now(),
  primary key (week_start, audience, recipient_id)
);

alter table public.spl_planning_email_dispatches enable row level security;
alter table public.spl_planning_email_queue enable row level security;
alter table public.spl_planning_email_deliveries enable row level security;

create policy "spl_planning_email_dispatches admin"
on public.spl_planning_email_dispatches for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_planning_email_queue admin"
on public.spl_planning_email_queue for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());

create policy "spl_planning_email_deliveries admin"
on public.spl_planning_email_deliveries for all to authenticated
using (public.is_planning_admin()) with check (public.is_planning_admin());
