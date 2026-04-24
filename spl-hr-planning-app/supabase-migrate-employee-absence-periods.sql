-- Migreert medewerker-afwezigheid van enkele datum naar periode (van/tot).
-- Veilig om meerdere keren uit te voeren.

alter table public.spl_employee_absences
  add column if not exists start_date date;

alter table public.spl_employee_absences
  add column if not exists end_date date;

update public.spl_employee_absences
set
  start_date = coalesce(start_date, absence_date),
  end_date = coalesce(end_date, absence_date)
where start_date is null or end_date is null;

alter table public.spl_employee_absences
  alter column start_date set not null;

alter table public.spl_employee_absences
  alter column end_date set not null;

alter table public.spl_employee_absences
  alter column absence_date drop not null;

alter table public.spl_employee_absences
  drop constraint if exists spl_employee_absences_date_range_check;

alter table public.spl_employee_absences
  add constraint spl_employee_absences_date_range_check
  check (start_date <= end_date);

alter table public.spl_employee_absences
  drop constraint if exists spl_employee_absences_employee_id_absence_date_key;
alter table public.spl_employee_absences
  drop constraint if exists spl_employee_absences_employee_id_start_date_end_date_reason_key;
alter table public.spl_employee_absences
  add constraint spl_employee_absences_employee_id_start_date_end_date_reason_key
  unique (employee_id, start_date, end_date, reason);
