-- Eenmalige import van definitieve locaties uit:
-- "Input planningsapplicatie SPL.xlsx - Locations.csv"
--
-- Wat dit script doet:
-- 1) Verwijdert alle bestaande locaties (en cascade op periodes + planningsregels).
-- 2) Leegt voorkeurslocaties bij medewerkers, zodat er geen oude ids blijven staan.
-- 3) Voegt de definitieve locaties toe met 1 periode en slots per weekdag.
--
-- Let op: CSV bevat 1 waarde per dag; die wordt hier op 'ochtend' gezet.
-- 'middag' wordt op 0 gezet.

begin;

-- Oude locaties + gekoppelde periodes/planning eruit.
delete from public.spl_locations;

-- Eventuele oude voorkeurslocatie-id's bij medewerkers opruimen.
update public.spl_employees
set preferred_location_ids = '{}'::uuid[],
    updated_at = now()
where coalesce(array_length(preferred_location_ids, 1), 0) > 0;

with source (
  sort_order,
  name,
  place,
  email,
  ma,
  di,
  wo,
  thu,
  vr
) as (
  values
    (0,  'Olleke Bolleke',                     'Leiden',      'ollekebolleke@splopvang.nl',           4.5,  4.5,  4.5,  4.5,  4.5),
    (1,  'Kleine Urt',                         'Leiden',      'kleineurt@splopvang.nl',                4.5,  4.5,  4.5,  4.5,  null),
    (2,  'Zuid-West',                          'Leiden',      'zuidwest@splopvang.nl',                 4.5,  4.5,  4.5,  4.5,  4.5),
    (3,  'Leistroom',                          'Leiden',      'leistroom@splopvang.nl',                4.5,  4.5,  4.5,  4.5,  4.5),
    (4,  'Astronaut',                          'Leiden',      'astronaut@splopvang.nl',                4.5,  4.5,  null, 4.5,  4.5),
    (5,  'Apollo (Montessori)',                'Leiden',      'apollo@splopvang.nl',                   4.5,  4.5,  4.5,  4.5,  4.5),
    (6,  'Mengelmoes',                         'Leiden',      'pcmengelmoes@splopvang.nl',             4.5,  4.5,  4.5,  4.5,  4.5),
    (7,  'Piraatje',                           'Leiden',      'piraatjeleiden@splopvang.nl',           4.5,  4.5,  null, 4.5,  4.5),
    (8,  'De Mors',                            'Leiden',      'pcdemors@splopvang.nl',                 4.5,  4.5,  null, 4.5,  4.5),
    (9,  'Floddertje',                         'Leiden',      'floddertje@splopvang.nl',               4.5,  4.5,  4.5,  4.5,  4.5),
    (10, 'Duimelot',                           'Leiden',      'duimelot@splopvang.nl',                 4.5,  4.5,  4.5,  4.5,  4.5),
    (11, 'Groep 1: Rood',                      'Leiden',      'pchetgebouwrb@splopvang.nl',            7.5,  7.5,  3.75, 7.5,  7.5),
    (12, 'Groep 2: blauw',                     'Leiden',      'pchetgebouwrb@splopvang.nl',            7.5,  7.5,  3.75, 7.5,  7.5),
    (13, 'Groep 3: groen',                     'Leiden',      'pchetgebouwgg@splopvang.nl',            7.5,  7.5,  3.75, 7.5,  7.5),
    (14, 'Groep 4: geel',                      'Leiden',      'pchetgebouwgg@splopvang.nl',            7.5,  7.5,  3.75, 7.5,  7.5),
    (15, 'Peuterspeelklas Gebouw',             'Leiden',      'gebouw@splopvang.nl',                   4.5,  4.5,  null, 4.5,  4.5),
    (16, 'Merenwijk Pir 1',                    'Leiden',      'pcmerenwijk@splopvang.nl',              4.5,  4.5,  4.5,  4.5,  null),
    (17, 'Merenwijk Pir 2',                    'Leiden',      'pcmerenwijk@splopvang.nl',              4.5,  4.5,  null, 4.5,  4.5),
    (18, 'Groen Knollenland',                  'Leiden',      'groenknollenland@splopvang.nl',         4.5,  4.5,  4.5,  4.5,  4.5),
    (19, 'Ot en Sien',                         'Leiden',      'otensien@splopvang.nl',                 4.5,  4.5,  null, 4.5,  4.5),
    (20, 'Pippeloentje',                       'Leiden',      'pippeloentje@splopvang.nl',             4.5,  4.5,  4.5,  4.5,  4.5),
    (21, 'Gouden Poort (antroposofische)',     'Leiden',      'goudenpoort@splopvang.nl',              4.5,  4.5,  4.5,  4.5,  4.5),
    (22, 'Groeigroep',                         'Leiden',      'groeigroep@splopvang.nl',               4.5,  4.5,  null, 4.5,  4.5),
    (23, 'Piraatje Lisse',                     'Lisse',       'piraatjelisse@splopvang.nl',            4.5,  4.5,  4.5,  4.5,  4.5),
    (24, 'Morgenster',                         'Noordwijk',   'morgenster@splopvang.nl',               4.5,  4.5,  4.5,  4.5,  null),
    (25, 'Duintop VSO',                        'Noordwijk',   'duintop@splopvang.nl',                  1.0,  1.0,  null, 1.0,  null),
    (26, 'Duintop TSO',                        'Noordwijk',   'duintop@splopvang.nl',                  1.25, 1.25, null, 1.25, 1.25),
    (27, 'Duintop BSO',                        'Noordwijk',   'duintop@splopvang.nl',                  4.0,  4.0,  4.0,  4.0,  4.0),
    (28, 'De Ballon',                          'Leiden',      'ballon@splopvang.nl',                   4.5,  4.5,  4.5,  4.5,  4.5),
    (29, 'Steffie',                            'Leiden',      'steffie@splopvang.nl',                  4.5,  4.5,  4.5,  4.5,  4.5),
    (30, 'Jippie',                             'Leiden',      'jippie@splopvang.nl',                   4.5,  4.5,  null, 4.5,  4.5),
    (31, 'Hooiberg',                           'Voorschoten', 'hooiberg@splopvang.nl',                 4.5,  4.5,  4.5,  4.5,  4.5),
    (32, 'Boerderij',                          'Voorschoten', 'boerderij@splopvang.nl',                4.5,  4.5,  4.5,  4.5,  4.5),
    (33, 'Olleke Bolleke',                     'Voorschoten', 'ollekebollekevoorschoten@splopvang.nl', 4.5,  4.5,  4.5,  4.5,  4.5),
    (34, 'Kwetternest',                        'Voorschoten', 'kwetternestvoorschoten@splopvang.nl',   4.5,  4.5,  4.5,  4.5,  4.5),
    (35, 'Pippeloen',                          'Voorschoten', 'pippeloenvoorschoten@splopvang.nl',     4.5,  4.5,  4.5,  4.5,  null),
    (36, 'Boschfluiters',                      'Voorschoten', 'boschfluiters@splopvang.nl',            null, 4.5,  4.5,  4.5,  4.5)
),
inserted_locations as (
  insert into public.spl_locations (
    name,
    place,
    email,
    sort_order
  )
  select
    s.name,
    s.place,
    s.email,
    s.sort_order
  from source s
  order by s.sort_order
  returning id, sort_order
)
insert into public.spl_location_periods (
  location_id,
  start_date,
  end_date,
  slots,
  sort_order
)
select
  l.id,
  date '2026-01-01',
  date '2026-12-31',
  jsonb_build_object(
    'ma',  jsonb_build_object('ochtend', s.ma,  'middag', 0),
    'di',  jsonb_build_object('ochtend', s.di,  'middag', 0),
    'wo',  jsonb_build_object('ochtend', s.wo,  'middag', 0),
    'do',  jsonb_build_object('ochtend', s.thu, 'middag', 0),
    'vr',  jsonb_build_object('ochtend', s.vr,  'middag', 0)
  ),
  0
from inserted_locations l
join source s on s.sort_order = l.sort_order;

commit;
