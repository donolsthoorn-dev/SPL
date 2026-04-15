-- SPL Planningsapp MVP schema
-- PostgreSQL-compatible DDL

create extension if not exists "pgcrypto";

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists location_periods (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  closure_type text not null default 'none' check (closure_type in ('none', 'daypart_closed', 'location_closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on <= ends_on)
);

create table if not exists location_opening_slots (
  id uuid primary key default gen_random_uuid(),
  location_period_id uuid not null references location_periods(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  day_part text not null check (day_part in ('ochtend', 'middag')),
  is_open boolean not null default true,
  hours numeric(4,2) not null default 4.5 check (hours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_period_id, weekday, day_part)
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contract_type text not null check (contract_type in ('vast', 'oproepkracht')),
  is_active boolean not null default true,
  max_hours_per_week numeric(4,2) not null default 22.5 check (max_hours_per_week >= 0),
  max_hours_per_day numeric(4,2) not null default 4.5 check (max_hours_per_day >= 0),
  max_days_per_week smallint not null default 5 check (max_days_per_week between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_availabilities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  created_at timestamptz not null default now(),
  unique (employee_id, weekday)
);

create table if not exists employee_absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  absence_date date not null,
  day_part text not null check (day_part in ('hele_dag', 'ochtend', 'middag')),
  reason text not null check (reason in ('ziek', 'bijzonder_verlof')),
  created_at timestamptz not null default now(),
  unique (employee_id, absence_date, day_part)
);

create table if not exists employee_preferences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  day_part text check (day_part in ('ochtend', 'middag')),
  is_fixed boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_date date not null,
  day_part text not null check (day_part in ('ochtend', 'middag')),
  hours numeric(4,2) not null default 4.5 check (hours > 0),
  status text not null default 'concept' check (status in ('concept', 'gepubliceerd')),
  location_id uuid not null references locations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete restrict,
  created_by text,
  updated_by text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, assignment_date, day_part)
);

create table if not exists publish_batches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  is_active boolean not null default true,
  published_at timestamptz not null default now(),
  published_by text not null
);

create table if not exists publish_batch_assignments (
  publish_batch_id uuid not null references publish_batches(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  primary key (publish_batch_id, assignment_id)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
