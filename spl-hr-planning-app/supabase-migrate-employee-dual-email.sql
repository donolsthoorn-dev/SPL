-- One-shot migratie: bestaand email = zakelijk, extra private_email
-- + toggle om te bepalen welke e-mail gebruikt wordt voor planning (standaard: prive).
-- Veilig meerdere keren uit te voeren (idempotent).

begin;

lock table public.spl_employees in share row exclusive mode;

alter table public.spl_employees
  add column if not exists private_email text;

alter table public.spl_employees
  add column if not exists planning_email_is_private boolean not null default true;

alter table public.spl_employees
  drop column if exists business_email;

-- Oude boolean eventueel migreren naar de nieuwe semantiek.
alter table public.spl_employees
  add column if not exists planning_email_is_business boolean;

update public.spl_employees
set planning_email_is_private = coalesce(
      planning_email_is_private,
      case
        when planning_email_is_business is null then true
        else not planning_email_is_business
      end,
      true
    )
where planning_email_is_private is null
   or planning_email_is_business is not null;

alter table public.spl_employees
  drop column if exists planning_email_is_business;

-- `email` blijft zakelijke mail; forceer default voorkeur naar prive.
update public.spl_employees
set planning_email_is_private = true
where planning_email_is_private is distinct from true;

commit;
