-- Bezettingsgrenzen per locatie (min/max medewerkers per open dagdeel).
-- Idempotent: veilig meerdere keren uit te voeren.

begin;

alter table public.spl_locations
  add column if not exists min_employees int;

alter table public.spl_locations
  add column if not exists max_employees int;

update public.spl_locations
set min_employees = 2
where min_employees is null or min_employees < 1;

update public.spl_locations
set max_employees = 4
where max_employees is null or max_employees < 1;

update public.spl_locations
set max_employees = min_employees
where max_employees < min_employees;

alter table public.spl_locations
  alter column min_employees set default 2,
  alter column min_employees set not null;

alter table public.spl_locations
  alter column max_employees set default 4,
  alter column max_employees set not null;

alter table public.spl_locations
  drop constraint if exists spl_locations_min_employees_check;

alter table public.spl_locations
  add constraint spl_locations_min_employees_check
  check (min_employees >= 1);

alter table public.spl_locations
  drop constraint if exists spl_locations_max_employees_check;

alter table public.spl_locations
  add constraint spl_locations_max_employees_check
  check (max_employees >= min_employees);

commit;
