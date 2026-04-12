# Projectplan Planningsapplicatie SPL

## 1) Doel en resultaat
SPL wil snel van foutgevoelige Excel-planning naar een centrale applicatie voor 26 locaties en circa 120 medewerkers.

De app moet:
- roosters maken en aanpassen bij sluiting van dagdelen/locaties;
- sturen op vaste gezichten en vaste inzet per locatie;
- tekorten/overschotten in uren direct zichtbaar maken;
- planning tonen per locatie en per medewerker;
- planning delen via openbare link (alleen inzage);
- Nanda in staat stellen wijzigingen centraal door te voeren.

**Beoogd resultaat:** een werkende MVP binnen 2 weken in productie, met ruimte voor optimalisatie in de weken erna.

## 2) Scope

### In scope (MVP, binnen 2 weken live)
- Stamdata beheer:
  - `Locaties`: naam, openingstijden, einddatum dagdeel/locatie, vaste-gezicht-regels.
  - `Medewerkers`: contracttype, vaste werkdagen, max uren (22,5), afwezigheid.
- Planning:
  - Weekplanning genereren en handmatig aanpassen.
  - Weergave per locatie en per medewerker.
  - Signalering: onder-/overbezetting locatie, onder-/overplanning medewerker.
- Rollen en rechten:
  - Admin (Don), Beheer (Nanda), HR (alleen personeel), Inzage (teamleiders).
- Functionaliteiten:
  - "Kopieer naar volgende week".
  - Publiceer read-only rooster-link voor teamleiders/medewerkers.
  - E-mail versturen van planning naar medewerkers.

### Buiten scope (na go-live)
- Geavanceerde automatische optimalisatie met AI/OR-engine.
- Integratie met externe HR/loonpakket-systemen.
- Mobiele app (responsive web eerst).

## 3) Eisen en uitgangspunten
- Per locatie 3, max 4 verschillende PP'ers in inzet.
- Openingstijden als basis voor benodigde inzet (4,5 uur-blokken).
- Medewerker max 5 dagen x 4,5 uur = 22,5 uur/week.
- Rekening houden met:
  - vaste werkdagen;
  - vast gezicht op groep;
  - afwezigheid (ziek/bijzonder verlof);
  - geplande sluiting van dagdelen/locaties met ingangsdatum.
- Wijzigingen in planning lopen via Nanda (procesowner).

## 4) Aanpak: versnelde 2-weken implementatie

### Week 1 - Build en test (dag 1 t/m 5)
- Dag 1:
  - Kick-off met Don, Nanda, HR (max 2 uur).
  - Definitieve beslisregels en acceptatiecriteria vastleggen.
  - Datamapping uit Excel afronden.
- Dag 2-3:
  - Inrichten rollen/rechten.
  - Locatie- en medewerkersbeheer opleveren.
  - Basis weekplanning met handmatige wijziging bouwen.
- Dag 4:
  - Views per locatie en per medewerker.
  - Signalering van tekorten/overschotten uren.
- Dag 5:
  - Interne test met key-users.
  - Bevindingen verwerken.

### Week 2 - Oplevering en livegang (dag 6 t/m 10)
- Dag 6:
  - "Kopieer naar volgende week" toevoegen.
  - E-mailfunctionaliteit voor planning.
- Dag 7:
  - Openbare read-only link voor inzage afronden.
  - Beveiligingscontrole op gedeelde link.
- Dag 8:
  - Gebruikersacceptatietest (Nanda, HR, teamleiders).
  - Laatste kritieke fixes.
- Dag 9:
  - Datamigratie van actuele planning.
  - Instructiesessie (30-60 min) voor gebruikers.
- Dag 10:
  - Productie live.
  - Hypercare dag 1 met directe ondersteuning.

## 5) Rollen in het project
- **Opdrachtgever:** Annelies (scope, prioriteiten, besluitvorming).
- **Proceseigenaar / Beheer:** Nanda (planningregels, acceptatie, dagelijkse werking).
- **HR key-user:** medewerkerdata en afwezigheid.
- **Implementatie:** Don (ontwerp, bouw, test, livegang).
- **Teamleiders:** validatie inzage en gebruiksvriendelijkheid.

## 6) Kritische succesfactoren voor 2 weken
- Beslisregels worden op dag 1 definitief gemaakt (geen open punten na dag 2).
- Excel-data wordt direct opgeschoond en volledig aangeleverd.
- Dagelijkse korte besluitlijn met Don/Nanda (15 min stand-up).
- Scopebewaking: alleen MVP-functionaliteit voor livegang.

## 7) Acceptatiecriteria voor livegang
- Nanda kan binnen 30 minuten een volledige weekplanning maken of aanpassen.
- Per locatie en per medewerker is de planning direct inzichtelijk.
- Automatische signalering werkt voor:
  - locatie onder-/overbezetting;
  - medewerker onder-/over uren.
- Rekening met afwezigheid en max 22,5 uur.
- Teamleiders en medewerkers kunnen read-only via link kijken.
- Weekplanning kan worden gekopieerd naar volgende week.

## 8) Risico's en beheersing
- **Onduidelijke regels vaste gezichten** -> beslisboom vastleggen op dag 1.
- **Datakwaliteit in Excel** -> datacheck op dag 1-2, herstel direct.
- **Te veel wijzigingsverzoeken tijdens bouw** -> change freeze vanaf dag 6.
- **Adoptieproblemen** -> korte training + eenvoudige werkinstructie.
- **Privacy bij openbare link** -> minimale data tonen + unieke tokenlink.

## 9) Wat er na de 2 weken gebeurt
Na livegang start een korte optimalisatiefase (2-4 weken) met:
- verbeterde voorstelplanning;
- managementrapportages;
- eventueel koppelingen met andere systemen.

## 10) Directe actiepunten
- Plan kick-off (2 uur) met Don, Nanda en HR.
- Lever definitieve lijst met sluitingsdata per dagdeel/locatie aan.
- Verzamel alle actuele Excel-bestanden voor migratie.
- Wijs een beslisser aan die dagelijks knopen doorhakt.
