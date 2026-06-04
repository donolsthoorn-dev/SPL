-- Verwijder verborgen ochtend-toewijzingen op Duintop BSO (week 23 = maandag 2026-06-01).
-- Gebruik in Supabase: SQL Editor → New query → plak en voer stap voor stap uit.
--
-- Waarom: locatie heeft ochtend=0 (alleen middag open). Ochtend-rows zijn niet zichtbaar
-- in "Bezetting per locatie" maar blokkeren wel "Kopieer naar volgende week".
--
-- Let op: depubliceer week 23 eerst in de app (Publieke inzage → Depubliceren),
-- tenzij je bewust published data wilt aanpassen.

-- ---------------------------------------------------------------------------
-- 1) Controle: locatie + weekstatus
-- ---------------------------------------------------------------------------
select id, name
from public.spl_locations
where name ilike 'Duintop BSO';

select week_start, published, updated_at
from public.spl_planning_weeks
where week_start = date '2026-06-01';

-- ---------------------------------------------------------------------------
-- 2) Preview: welke ochtend-toewijzingen worden verwijderd?
-- ---------------------------------------------------------------------------
select
  a.id,
  a.week_start,
  a.weekday,
  a.day_part,
  e.name as medewerker,
  l.name as locatie
from public.spl_planning_assignments a
join public.spl_locations l on l.id = a.location_id
join public.spl_employees e on e.id = a.employee_id
where a.week_start = date '2026-06-01'
  and a.day_part = 'ochtend'
  and l.name = 'Duintop BSO'
order by a.weekday, e.name;

-- ---------------------------------------------------------------------------
-- 3) Verwijderen (alleen uitvoeren als preview klopt)
-- ---------------------------------------------------------------------------
-- delete from public.spl_planning_assignments a
-- using public.spl_locations l
-- where a.location_id = l.id
--   and l.name = 'Duintop BSO'
--   and a.week_start = date '2026-06-01'
--   and a.day_part = 'ochtend';

-- ---------------------------------------------------------------------------
-- 4) Verificatie
-- ---------------------------------------------------------------------------
-- select count(*) as remaining_ochtend
-- from public.spl_planning_assignments a
-- join public.spl_locations l on l.id = a.location_id
-- where a.week_start = date '2026-06-01'
--   and a.day_part = 'ochtend'
--   and l.name = 'Duintop BSO';

-- Middag-toewijzingen blijven staan:
-- select count(*) as middag_count
-- from public.spl_planning_assignments a
-- join public.spl_locations l on l.id = a.location_id
-- where a.week_start = date '2026-06-01'
--   and a.day_part = 'middag'
--   and l.name = 'Duintop BSO';

-- ---------------------------------------------------------------------------
-- 5) Diagnose: medewerkers met meer geplande uren dan contract (week 23)
--    (alleen informatief; uren komen uit locatie-periodes + toewijzingen)
-- ---------------------------------------------------------------------------
-- Zie supabase-diagnose-contracturen-week.sql voor een uitgebreidere query.
