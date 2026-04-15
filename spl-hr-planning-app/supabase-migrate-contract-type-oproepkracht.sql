-- One-shot migratie: contract_type 'Inval' -> 'OproepKracht'
-- Veilig meerdere keren uit te voeren (idempotent).

begin;

lock table public.spl_employees in share row exclusive mode;

-- 1) Data normaliseren naar de nieuwe canonical waarden.
update public.spl_employees
set contract_type = case
  when contract_type is null then 'Vast'
  when lower(trim(contract_type)) in ('inval', 'oproepkracht') then 'OproepKracht'
  when lower(trim(contract_type)) = 'vast' then 'Vast'
  else contract_type
end
where contract_type is distinct from case
  when contract_type is null then 'Vast'
  when lower(trim(contract_type)) in ('inval', 'oproepkracht') then 'OproepKracht'
  when lower(trim(contract_type)) = 'vast' then 'Vast'
  else contract_type
end;

-- 2) Oude check-constraints op contract_type (met o.a. "Inval"/"inval") verwijderen.
do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'spl_employees'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%contract_type%'
      and (
        pg_get_constraintdef(c.oid) ilike '%inval%'
        or pg_get_constraintdef(c.oid) ilike '%oproepkracht%'
      )
  loop
    execute format('alter table public.spl_employees drop constraint if exists %I', rec.conname);
  end loop;
end $$;

-- 3) Nieuwe strikte check op de gewenste waarden.
alter table public.spl_employees
  drop constraint if exists spl_employees_contract_type_check;

alter table public.spl_employees
  add constraint spl_employees_contract_type_check
  check (contract_type in ('Vast', 'OproepKracht'));

-- 4) Eventuele default consistent maken.
alter table public.spl_employees
  alter column contract_type set default 'Vast';

commit;

-- Optioneel: snelle verificatie na migratie
select contract_type, count(*) as aantal
from public.spl_employees
group by contract_type
order by contract_type;
