-- Eenmalige import van definitieve medewerkers uit:
-- "Input planningsapplicatie SPL.xlsx - Medewerkers.csv"
--
-- Wat dit script doet:
-- 1) Verwijdert alle bestaande medewerkers.
--    Let op: door ON DELETE CASCADE verdwijnen ook gekoppelde afwezigheden
--    en planningsregels (spl_planning_assignments) van deze medewerkers.
-- 2) Voegt de definitieve medewerkerslijst opnieuw toe.
--
-- Importregels:
-- - email         = zakelijk e-mailadres
-- - private_email = privé e-mailadres
-- - planning_email_is_private = true (standaard privé voorkeur)
-- - dagkolommen: alleen 'x' telt als vaste werkdag
--   (waarden zoals 'ziek' worden NIET als vaste werkdag geïmporteerd)

begin;

lock table public.spl_employees in share row exclusive mode;

delete from public.spl_employees;

with source (
  sort_order,
  name,
  email,
  private_email,
  planning_email_is_private,
  contract_type,
  week_hours,
  end_date,
  days
) as (
  values
    (0, 'Adriena Brandt', 'a.brandt@splopvang.nl', 'a3nahazenoot@hotmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (1, 'Andrea Ouwehand', 'a.ouwehand@splopvang.nl', 'andreaouwehand@ziggo.nl', true, 'Vast', 23.5, null, '{3,4}'::int[]),
    (2, 'Angela Groenendijk', 'a.groenendijk@splopvang.nl', 'angelasteenbok@hotmail.com', true, 'Vast', 22.25, null, '{1,2,3,4,5}'::int[]),
    (3, 'Angelique Tetteroo', 'a.tetteroo@splopvang.nl', 'angeliekjuuh@gmail.com', true, 'Vast', 13.5, null, '{1,2,4}'::int[]),
    (4, 'Annemieke van der Heide', 'a.heide@splopvang.nl', 'vanderheide.jw@gmail.com', true, 'Vast', 12.75, null, '{2,3,4}'::int[]),
    (5, 'Arlette van Ipenburg', 'a.ipenburg@splopvang.nl', 'arlette.einhorn@gmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (6, 'Astrid Volders', 'a.volders@splopvang.nl', 'astridvolders@hotmail.com', true, 'Vast', 21.25, null, '{1,2,3,4,5}'::int[]),
    (7, 'Bianca Bergman', 'b.bergman@splopvang.nl', 'bianca_alberts@hotmail.com', true, 'Vast', 13.25, null, '{1,2,3,4,5}'::int[]),
    (8, 'Brenda Middelkoop', 'b.kulk@splopvang.nl', 'kulkbrenda@hotmail.com', true, 'Vast', 18, null, '{1,2,3,5}'::int[]),
    (9, 'Caroline Verhoef', 'c.verhoef@splopvang.nl', 'carolineverhoef@hotmail.com', true, 'Vast', 18, null, '{2,3,4,5}'::int[]),
    (10, 'Cynthia Zwitselaar', 'c.zwitselaar@splopvang.nl', 'cynthiazwitselaar@hotmail.com', true, 'Vast', 18, null, '{1,2,3,4}'::int[]),
    (11, 'Danielle van Beek', 'd.beek@splopvang.nl', 'danievanbeek@hotmail.com', true, 'Vast', 18, null, '{}'::int[]),
    (12, 'Derya Pekmez', 'd.pekmez@splopvang.nl', 'd.pekmez@gmail.com', true, 'OproepKracht', 12, date '2026-04-30', '{1,2,3,4,5}'::int[]),
    (13, 'Diana Zuijderduijn', 'd.zuijderduijn@splopvang.nl', 'jcdglj@ziggo.nl', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (14, 'Dounia Abbassi', 'd.abbassi@splopvang.nl', 'Douniaabbassi13@gmail.com', true, 'Vast', 22.5, null, '{}'::int[]),
    (15, 'Ellen Lammers', 'e.lammers@splopvang.nl', 'Elge.lammers@gmail.com', true, 'Vast', 12.75, null, '{1,2,4}'::int[]),
    (16, 'Erna Gelpke', 'e.gelpke@splopvang.nl', 'erna_g@hotmail.com', true, 'Vast', 18, null, '{1,2,3,4}'::int[]),
    (17, 'Eva de Haan', 'e.haan@splopvang.nl', 'evabreen@hotmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (18, 'Gabriella Sjardijn', 'g.sjardijn@splopvang.nl', 'gp.82@hotmail.com', true, 'Vast', 21.75, null, '{1,2,3,4,5}'::int[]),
    (19, 'Gaby van Kooperen', 'g.kooperen@splopvang.nl', 'gabykirkham@gmail.com', true, 'Vast', 18, null, '{1,2,3,4}'::int[]),
    (20, 'Gerarda Blom', 'g.blom@splopvang.nl', 'g.blom@kpnmail.nl', true, 'OproepKracht', 14, date '2026-07-17', '{2,3,4,5}'::int[]),
    (21, 'Hicran Hoke', 'h.hoke@splopvang.nl', 'h.hoke@live.nl', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (22, 'Irene van Osnabrugge', null, 'irene@bertvanosnabrugge.nl', true, 'OproepKracht', 0, null, '{1,3,4,5}'::int[]),
    (23, 'Iris Dekker', 'i.dekker@splopvang.nl', 'Iris.dekker01@gmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (24, 'Jacqueline Carree', 'j.carree@splopvang.nl', 'jacquelinecarree@hotmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (25, 'Jacqueline Pluimers', 'j.pluimers@splopvang.nl', 'jacquelinepluimers@live.nl', true, 'Vast', 17, null, '{1,3,4,5}'::int[]),
    (26, 'Jeanette van Tongeren', 'j.tongeren@splopvang.nl', 'jfevantongeren@hotmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (27, 'Jessica van den Berg', 'j.berg@splopvang.nl', 'rjwberg@ziggo.nl', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (28, 'Jiska van Sante', 'j.sante@splopvang.nl', 'Jiskavansante@hotmail.com', true, 'Vast', 16, date '2026-08-31', '{1,2,4,5}'::int[]),
    (29, 'Jorina Biersteker', 'j.biersteker@splopvang.nl', 'jorina@casema.nl', true, 'Vast', 12.75, null, '{2,3,4}'::int[]),
    (30, 'Jorine Groen', 'j.groen@splopvang.nl', 'jorine.k.groen@gmail.com', true, 'Vast', 10.63, null, '{1,3}'::int[]),
    (31, 'Jose Faas', 'j.faas@splopvang.nl', 'jose_van_duuren@hotmail.com', true, 'Vast', 13.5, null, '{1,2,4}'::int[]),
    (32, 'Juliana Dijkhuizen', 'j.dijkhuizen@splopvang.nl', 'Julianadijkhuizen@gmail.com', true, 'OproepKracht', 12, date '2026-07-17', '{1,2,5}'::int[]),
    (33, 'Kamla Maatoug', 'k.maatoug@splopvang.nl', 'k.maatoug@gmail.com', true, 'OproepKracht', 22.5, null, '{1,2,3,4,5}'::int[]),
    (34, 'Karen van der Zaag', 'k.zaag@splopvang.nl', 'karenzo@ziggo.nl', true, 'Vast', 25, null, '{1,2,3,4,5}'::int[]),
    (35, 'Karin Ouwerkerk', 'k.ouwerkerk@splopvang.nl', 'karinouwerkerk1962@gmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (36, 'Kelly Peters', 'k.peters@splopvang.nl', 'winnie216921@hotmail.com', true, 'Vast', 18, null, '{1,2,3,4}'::int[]),
    (37, 'Kimberley van der Wal', 'k.wal@splopvang.nl', 'kimberley_weeda@hotmail.com', true, 'Vast', 24.5, date '2026-11-30', '{1,3,4,5}'::int[]),
    (38, 'Laura Remmelzwaal', 'l.remmelzwaal@splopvang.nl', 'lauraouwehand@hotmail.com', true, 'Vast', 13.5, null, '{3,4}'::int[]),
    (39, 'Lianne Molkenboer', 'l.molkenboer@splopvang.nl', 'liannemolkenboer@gmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (40, 'Linda Brabander', 'l.brabander@splopvang.nl', 'lindakort1983@gmail.com', true, 'Vast', 21.25, null, '{1,2,3,4,5}'::int[]),
    (41, 'Linda de Hoop', 'l.hoop@splopvang.nl', 'lindaammerlaan@xsmail.com', true, 'Vast', 17, null, '{1,2,3,4}'::int[]),
    (42, 'Linda de Jong', 'l.jong@splopvang.nl', 'lindadejong@casema.nl', true, 'Vast', 21.25, null, '{1,2,3,4,5}'::int[]),
    (43, 'Linda Mastboom', 'l.mastboom@splopvang.nl', 'lintjew@gmail.com', true, 'Vast', 13.5, null, '{1,2,4}'::int[]),
    (44, 'Marente Helmer', 'm.helmer@splopvang.nl', 'marentehelmer@gmail.com', true, 'Vast', 19, null, '{1,2,3,4}'::int[]),
    (45, 'Maria Mizab', 'm.mizab@splopvang.nl', 'marialeiden@hotmail.com', true, 'Vast', 26.25, null, '{}'::int[]),
    (46, 'Marian Rotteveel', 'm.rotteveel@splopvang.nl', 'marianrotteveel@hotmail.com', true, 'Vast', 9, null, '{1,5}'::int[]),
    (47, 'Marije Burggraaf', 'm.burggraaf@splopvang.nl', 'marijeburggraaf@gmail.com', true, 'Vast', 22.5, date '2026-07-17', '{1,2,3,4,5}'::int[]),
    (48, 'Marike Jonker', 'm.jonker@splopvang.nl', 'jonkermarike@gmail.com', true, 'Vast', 12.75, null, '{2,3,4}'::int[]),
    (49, 'Marit Kwast', 'm.kwast@splopvang.nl', 'maritkwast@gmail.com', true, 'Vast', 17, null, '{1,2,4,5}'::int[]),
    (50, 'Marloes Ruijgrok', 'm.ruijgrok@splopvang.nl', 'marloes-ruijgrok@hotmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (51, 'Mary Overbeek', 'm.overbeek@splopvang.nl', 'maryoverbeek@gmail.com', true, 'Vast', 9, date '2026-07-31', '{3,5}'::int[]),
    (52, 'Melissa Streeder', 'm.streeder@splopvang.nl', 'melissa.streeder@gmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (53, 'Mendy Wijnands', 'm.wijnands@splopvang.nl', 'mendy_wijnands@yahoo.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (54, 'Miranda Hellemond', 'm.hellemond@splopvang.nl', 'miranda.hellemond@ziggo.nl', true, 'Vast', 17, null, '{1,2,3,5}'::int[]),
    (55, 'Mirjam Jansen', 'm.jansen@splopvang.nl', 'mjhjansendriessen@live.nl', true, 'Vast', 20.63, null, '{2,3,4,5}'::int[]),
    (56, 'Monique de Wijs', 'm.rijneveen@splopvang.nl', 'moniquevanleeuwen1@ziggo.nl', true, 'Vast', 13.5, date '2026-07-31', '{1,2,5}'::int[]),
    (57, 'Monique Rijneveen', 'm.leeuwen@splopvang.nl', 'monique.1707@hotmail.com', true, 'Vast', 21.25, null, '{1,2,3,4,5}'::int[]),
    (58, 'Margriet Siepe', 'm.siepe@splopvang.nl', 'margriet.siepe@gmail.com', true, 'Vast', 4.25, null, '{3}'::int[]),
    (59, 'Nadia Abid', 'n.abid@splopvang.nl', 'n.ayra@hotmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (60, 'Nadira Gaier', null, 'n.gaier@hotmail.com', true, 'OproepKracht', 0, null, '{1,2,3,4,5}'::int[]),
    (61, 'Nanda van Buuren', 'n.buuren@splopvang.nl', 'nandavanbuuren@hotmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (62, 'Naomi Bakker', 'n.bakker@splopvang.nl', 'naoom.b@hotmail.com', true, 'Vast', 13.5, date '2026-12-31', '{2,3,4}'::int[]),
    (63, 'Nefissa Achour', 'n.achour@splopvang.nl', 'nefissa@casema.nl', true, 'Vast', 15, null, '{}'::int[]),
    (64, 'Nuran Baran', 'n.baran@splopvang.nl', 'n.ozdemir-baran@hotmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (65, 'Patricia Kort', 'p.kort@splopvang.nl', 'pvdwel@hotmail.com', true, 'OproepKracht', 16, null, '{1,2,4,5}'::int[]),
    (66, 'Patricia van der Pols', 'p.vanderpols@splopvang.nl', 'patriciapols973@gmail.com', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (67, 'Pinar Arslan', 'p.arslan@splopvang.nl', 'pinarakca@hotmail.com', true, 'Vast', 26.25, null, '{1,2,3,5}'::int[]),
    (68, 'Rachida Lamzira', 'r.lamzira@splopvang.nl', 'rachabde@hotmail.nl', true, 'Vast', 22.25, null, '{1,2,3,4,5}'::int[]),
    (69, 'Renuka de Weijer', 'r.weijer@splopvang.nl', 'renukadeweijer@hotmail.com', true, 'Vast', 18, null, '{2,3,4,5}'::int[]),
    (70, 'Rian Meeuwenberg', 'r.meeuwenberg@splopvang.nl', 'rian62meeuw@gmail.com', true, 'Vast', 13.5, null, '{1,2,4}'::int[]),
    (71, 'Rosa Verplancke', 'r.verplancke@splopvang.nl', 'rosa-verplancke@hotmail.nl', true, 'Vast', 13.5, date '2026-07-17', '{}'::int[]),
    (72, 'Samantha Verplancke', 's.verplancke@splopvang.nl', 'samantha_verplancke@hotmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (73, 'Samira Elfarh', null, 'samiraelfarh@hotmail.com', true, 'OproepKracht', 12, date '2027-01-31', '{1,3,4}'::int[]),
    (74, 'Sandra Zuiderduin', 's.zuiderduin@splopvang.nl', 'mzuiderduin@ziggo.nl', true, 'Vast', 18, null, '{1,3,4,5}'::int[]),
    (75, 'Semanur Kasapoglu', 's.kasapoglu@splopvang.nl', 'ssemanursk40@hotmail.com', true, 'OproepKracht', 8, date '2026-08-31', '{1,3,5}'::int[]),
    (76, 'Sheila Kops', 's.kops@splopvang.nl', 'sheila.kops@hotmail.com', true, 'OproepKracht', 11.71, null, '{1,3,4,5}'::int[]),
    (77, 'Sheila Zonneveld', 's.zonneveld@splopvang.nl', 'chloekenzo@hotmail.com', true, 'OproepKracht', 22.5, null, '{}'::int[]),
    (78, 'Sozdar Yuce', 's.yuce@splopvang.nl', 'Sozdar-@Live.nl', true, 'OproepKracht', 21, date '2026-08-31', '{1,2,3,4,5}'::int[]),
    (79, 'Tamar Zaal', 't.zaal@splopvang.nl', 'atadoly@hotmail.com', true, 'Vast', 13.5, null, '{1,4,5}'::int[]),
    (80, 'Tessa van der Plas', 't.plas@splopvang.nl', 'vanderplastessa@gmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (81, 'Wafae Baghat', 'w.baghat@splopvang.nl', 'w.baghat@hotmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (82, 'Willeke Vletter', 'w.vletter@splopvang.nl', 'f.vletter@live.nl', true, 'Vast', 22.5, null, '{}'::int[]),
    (83, 'Willyanne van Dijk', 'w.oever@splopvang.nl', 'willyanne1@hotmail.com', true, 'Vast', 13.5, date '2026-11-30', '{1,2,3}'::int[]),
    (84, 'Wobke van Bent', 'w.bent@splopvang.nl', 'mail@wobkegeertsma.nl', true, 'Vast', 22.5, null, '{1,2,3,4,5}'::int[]),
    (85, 'Yasmina Serraj', 'y.serraj@splopvang.nl', 'yasminaserraj@gmail.com', true, 'Vast', 18, null, '{1,2,4,5}'::int[]),
    (86, 'Yvonne van Rooijen', null, 'yvonnevanrooijen@ziggo.nl', true, 'OproepKracht', 0, null, '{1,2,3,4,5}'::int[]),
    (87, 'Zaineb Mouhtaj', 'z.mouhtaj@splopvang.nl', 'zaineb_mouhtaj@hotmail.com', true, 'Vast', 26.25, null, '{2,3,4,5}'::int[]),
    (88, 'Saskia de Haas', 's.haas@splopvang.nl', 'dehaass@hotmail.com', true, 'Vast', 27, null, '{1,2,3,4}'::int[]),
    (89, 'Ruben Blanken', 'r.blanken@splopvang.nl', 'Rubenblanken400@gmail.com', true, 'OproepKracht', 0, null, '{1,2,3,4,5}'::int[]),
    (90, 'Sandy van Abswoude', 's.abswoude@splopvang.nl', 'sandyvanabswoude2002@outlook.com', true, 'Vast', 16, null, '{1,3}'::int[]),
    (91, 'Tim van Abswoude', null, 'timvanabswoudeq@gmail.com', true, 'OproepKracht', 0, date '2026-06-30', '{1,2,3,4,5}'::int[]),
    (92, 'Desiree Loontjens', 'd.loontjens@splopvang.nl', 'deesje003@outlook.com', true, 'Vast', 16, date '2026-10-31', '{2,4,5}'::int[]),
    (93, 'Sammy Wubbe SAC', 's.wubbe@splopvang.nl', 'swubbe023@gmail.com', true, 'Vast', 18, date '2026-10-31', '{2,3,4}'::int[]),
    (94, 'Stefanie Belt', 's.belt@splopvang.nl', 'stefaniebelt@hotmail.com', true, 'Vast', 12, null, '{2,4}'::int[])
)
insert into public.spl_employees (
  name,
  email,
  private_email,
  planning_email_is_private,
  contract_type,
  week_hours,
  end_date,
  days,
  preferred_location_ids,
  sort_order,
  updated_at
)
select
  s.name,
  s.email,
  s.private_email,
  s.planning_email_is_private,
  s.contract_type,
  s.week_hours,
  s.end_date,
  s.days,
  '{}'::uuid[],
  s.sort_order,
  now()
from source s
order by s.sort_order;

commit;
