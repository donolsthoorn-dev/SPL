# Incident runbook: weekdata weg na kopie

Gebruik dit protocol als een planner meldt dat data verdwenen is na `Kopieer vorige week`.

## 1) Directe triage (read-only)

Vul in:
- `:target_week_start` = week die leeg lijkt
- `:source_week_start` = vorige week (`target - 7 dagen`)

```sql
-- 1. Bestaan er assignments in target/source week?
select week_start, count(*) as assignment_count
from public.spl_planning_assignments
where week_start in (:target_week_start::date, :source_week_start::date)
group by week_start
order by week_start;

-- 2. Controle: zijn week keys op maandag opgeslagen?
select distinct week_start
from public.spl_planning_assignments
where week_start between (:source_week_start::date - interval '14 day') and (:target_week_start::date + interval '14 day')
  and extract(isodow from week_start) <> 1
order by week_start;

-- 3. Is target week gepubliceerd?
select week_start, published, updated_at
from public.spl_planning_weeks
where week_start = :target_week_start::date;
```

Interpretatie:
- Geen rows in target maar wel in source: terugkopie mogelijk.
- Rows in target maar UI lijkt leeg: controleer open/gesloten dagdelen in locaties.
- Rows met niet-maandag `week_start`: data is onder verkeerde week-key opgeslagen.

## 2) Herstelopties

1. **Snelle functionele herstelactie**
   - Open target week in planning.
   - Gebruik `Kopieer vorige week` opnieuw nadat bronweek is gecontroleerd.
2. **Handmatige SQL-herstelactie**
   - Alleen gebruiken met bevestiging van product owner.
   - Kopieer rows van source naar target met `insert ... select`.
3. **Platform backup/PITR**
   - Alleen als Supabase Point-In-Time Recovery beschikbaar is.

## 3) Verificatie na herstel

```sql
select count(*) as assignment_count
from public.spl_planning_assignments
where week_start = :target_week_start::date;
```

- Controleer daarna in UI of ingevulde dagdelen zichtbaar zijn.
- Controleer dat target `weekStart` maandag is.

## 4) Preventie (geïmplementeerd)

- API accepteert alleen `weekStart` die op maandag valt.
- Client normaliseert weekkeuze naar maandag.
- Weeksave gebruikt upsert-then-prune i.p.v. delete-then-insert om partiële dataverwijdering te voorkomen.
- API logt `weekStart` en assignment-aantallen bij save voor snellere incidentanalyse.
