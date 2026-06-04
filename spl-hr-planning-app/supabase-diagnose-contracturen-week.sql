-- Diagnose: welke medewerkers hebben in week 23 te veel toewijzingen t.o.v. contract?
-- Vervang week_start indien nodig (altijd maandag).
-- Voer uit in Supabase SQL Editor na stap 1 (alleen tellen, geen wijzigingen).

-- Aantal diensten per medewerker (handig bij dubbel ingepland)
select
  e.name,
  e.week_hours as contract_uren,
  count(*) as aantal_toewijzingen,
  count(distinct (a.weekday, a.day_part)) as unieke_dagdelen,
  count(*) - count(distinct (a.weekday, a.day_part)) as mogelijke_dubbelingen_zelfde_dagdeel
from public.spl_planning_assignments a
join public.spl_employees e on e.id = a.employee_id
where a.week_start = date '2026-06-01'
group by e.id, e.name, e.week_hours
having count(*) > count(distinct (a.weekday, a.day_part))
order by e.name;

-- Detail: alle toewijzingen van genoemde medewerkers (pas namen aan)
select
  e.name,
  a.weekday,
  a.day_part,
  l.name as locatie,
  a.id as assignment_id
from public.spl_planning_assignments a
join public.spl_employees e on e.id = a.employee_id
join public.spl_locations l on l.id = a.location_id
where a.week_start = date '2026-06-01'
  and e.name in (
    'Rachida Lamzira',
    'Semanur Kasapoglu',
    'Margriet Siepe',
    'Juliana Dijkhuizen',
    'Samira Elfarh',
    'Kamla Maatoug',
    'Patricia Kort',
    'Jessica van den Berg'
  )
order by e.name, a.weekday, a.day_part, l.name;
