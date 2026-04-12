# Prototype Testscenario's en Checklist

Gebruik deze scenario's om de prototypekwaliteit te valideren voordat de echte bouw start.

Let op: in het prototype staat geen scenario-keuze meer in de sidebar; stappen met `Kies scenario …` zijn niet meer uitvoerbaar via de UI en dienen als richting voor latere bouw of handmatige data-aanpassing.

## Scenario 1 - Dagdeel sluiting
- ~~Kies scenario `Dagdelen sluiten`.~~ (niet meer in prototype-UI)
- Open `Bezetting per locatie`.
- Navigeer met `Vorige week` en `Volgende week` en controleer dat de weekdatum steeds 7 dagen verschuift.
- Klik op `Kopieer vorige week` en controleer dat een bevestigingsprompt verschijnt met de datum van vorige week.
- Kies `Annuleren` en controleer dat er niets gebeurt.
- Klik opnieuw en kies bevestigen; controleer dat de prototype-bevestiging wordt getoond.
- Controleer dat op dit scherm geen zoekbalk zichtbaar is.
- Controleer dat bij minimaal 1 locatie dinsdag en donderdag als witte `Gesloten` vakken zichtbaar zijn en niet klikbaar zijn.
- Controleer dat de gesloten cel als gesloten/waarschuwing zichtbaar is.
- Verwachte uitkomst: toewijzen op gesloten cel wordt geblokkeerd.

## Scenario 2 - Volledige locatiesluiting
- ~~Kies scenario `Locatie sluiting`.~~ (niet meer in prototype-UI)
- Controleer dat alle dagdelen voor de sluitlocatie gemarkeerd zijn.
- Verwachte uitkomst: suggesties geven geen toelaatbare kandidaten voor gesloten slots.

## Scenario 9 - Dagdeelmodel per locatie + locatiecheck
- Open `Bezetting per locatie`.
- Controleer dat reguliere locaties alleen ochtend-rijen tonen (geen middag-rij).
- Controleer dat alleen `Het Gebouw`-groepen een mix tonen:
  - `Groep 1: Rood` en `Groep 2: blauw` in ochtend,
  - `Groep 3: groen` en `Groep 4: geel` in middag.
- Controleer dat bij een locatie met meer dan 5 verschillende medewerkers in die week een waarschuwing op het locatievak staat (`x/5`).
- Verwachte uitkomst: compactere tabel en zichtbare waarschuwing bij overschrijding.

## Scenario 3 - Ziekte/verlof piek
- ~~Kies scenario `Ziekte/verlof piek`.~~ (niet meer in prototype-UI)
- Selecteer cel met afwezige vaste medewerker.
- Klik `Bereken suggesties`.
- Verwachte uitkomst: afwezige medewerker verschijnt onder afgewezen kandidaten.

## Scenario 4 - Herplaatsing
- ~~Kies scenario `Herplaatsing medewerkers`.~~ (niet meer in prototype-UI)
- Controleer in `Bezetting per medewerker` dat inzet verschuift naar nieuwe locatie.
- Verwachte uitkomst: uren blijven zichtbaar, locatieverdeling verandert.

## Scenario 5 - Publicatieflow
- Open `Publieke inzage`.
- Controleer dat zonder publicatie melding "Geen gepubliceerde planning" getoond wordt.
- Klik `Publiceer` en controleer opnieuw.
- Verwachte uitkomst: publieke tabel toont nu read-only rooster.

## Scenario 6 - Detail in zelfde frame
- Open `Locaties` en klik op een willekeurige rij.
- Verwachte uitkomst: `Locatie detail` opent binnen dezelfde app-shell (geen losse pagina).
- Klik `Terug naar locaties`.
- Herhaal hetzelfde in `Personeel`.

## Scenario 7 - Periode verwijderen
- Open een locatie-detail en voeg minimaal 2 perioden toe.
- Pas in een periode voor een specifieke dag/dagdeel de uren aan naar `0`.
- Controleer dat het bijbehorende dagdeelblok in `Bezetting per locatie` als `Gesloten` (wit, niet planbaar) verschijnt.
- Controleer dat per periode de ureninvoer in 1 compacte matrix staat:
  - kolomkoppen = maandag t/m vrijdag,
  - eerste invulrij = ochtend,
  - tweede invulrij = middag.
- Klik op `Periode verwijderen` bij de 2e periode.
- Verwachte uitkomst: bevestigingsprompt verschijnt.
- Kies `Annuleren`: periode blijft staan.
- Klik opnieuw en kies bevestigen: periode wordt verwijderd.

## Scenario 8 - Medewerkerdetail velden
- Open een medewerkerdetail vanuit het overzicht.
- Controleer dat labels zichtbaar zijn bij `Naam medewerker`, `Contracttype`, `Uren per week` en `Uit dienst per`.
- Controleer dat deze 4 velden op 1 rij in 4 kolommen staan.
- Selecteer werkdagen in de compacte matrix (dagen als kolomkoppen, checkboxes op de tweede rij).
- Verplaats locaties met de hevelknoppen van `Beschikbare locaties` naar `Geselecteerde locaties`.
- Dubbelklik op een locatie in links/rechts en controleer dat deze direct naar de andere lijst verhuist.
- Voeg meerdere afwezigheidsregels toe met datum en reden (`Ziek` of `Bijzonder verlof`).
- Klik per nieuwe afwezigheidsregel eerst op `Toepassen`.
- Klik `Opslaan`.
- Verwachte uitkomst: validatie slaagt bij minimaal 1 werkdag en gegevens worden bewaard.
- Na opslaan tonen afwezigheidsregels de actie `Verwijderen`.

## Acceptatiechecklist
- [ ] Navigatie tussen alle modules werkt zonder dode einden.
- [ ] Celselectie, toewijzen, vervangen en leegmaken werken.
- [ ] Suggesties tonen score en redencodes.
- [ ] Conflicten worden zichtbaar in assistentpaneel.
- [ ] Zoek en snelle filters reageren op planningstabellen.
- [ ] Weeknavigatie op `Bezetting per locatie` verschuift telkens 7 dagen.
- [ ] Header bevat zowel `Filter op bezetting` als `Filter op locatie`.
- [ ] Legenda staat in de balk boven de planningstabel (naast conflictenteller).
- [ ] Filter `onderbezet/overbezet/conflicten` filtert zichtbare planningcellen correct.
- [ ] `Filter op locatie` toont alleen rijen van de gekozen locatie en verbergt de rest.
- [ ] Conflictenteller in de balk boven de tabel toont het juiste actuele aantal conflicten.
- [ ] Rijen zonder filtermatches worden niet getoond.
- [ ] Overbezetting is standaard aanwezig in demo-data en zichtbaar via filter.
- [ ] Er zijn verspreid meerdere volgeplande blokken (4 medewerkers) zichtbaar in de baseline.
- [ ] Dubbele medewerker op hetzelfde dagdeel is standaard aanwezig en zichtbaar via conflictfilter.
- [ ] Medewerkersnamen in locatiecellen tonen per regel met afkapping bij lange namen.
- [ ] Medewerkers verschijnen als kaartjes in cellen, inclusief sleepgedrag en verwijderknop.
- [ ] Planner assistent toont `Beschikbare` en `Niet beschikbare` medewerkers in aparte blokken.
- [ ] Planner assistent verschijnt pas na klik op een planningcel in `Bezetting per locatie`.
- [ ] Zonder geselecteerde planningcel vult de witte werkruimte de volle breedte (assistent verborgen).
- [ ] Planner assistent toont `Geplande medewerkers` exact conform geselecteerde cel.
- [ ] Medewerkerkaartjes tonen urenstand rechts uitgelijnd (`x/y`).
- [ ] Tijdens slepen lichten alleen toepasbare planningcellen op.
- [ ] Suggesties staan bovenaan en tonen maximaal 3 kandidaten.
- [ ] Klik op suggestie/beschikbare medewerker plant direct en verplaatst die medewerker naar `Geplande medewerkers`.
- [ ] Planningsmatrix bevat alle locaties en gebruikt alle medewerkers in de baseline planning.
- [ ] Dagdeelrijen die volledig gesloten zijn worden niet getoond in `Bezetting per locatie`.
- [ ] Alleen `Het Gebouw` gebruikt zowel ochtend als middag; overige locaties tonen 1 dagdeel.
- [ ] Locatievak toont waarschuwing zodra >5 verschillende medewerkers op die locatie in de week staan.
- [ ] Publieke inzage volgt publicatiestatus.
- [ ] Locatie- en medewerkerdetail openen binnen `index.html` frame.
- [ ] Periode verwijderen gebruikt bevestiging en werkt alleen voor periode 2+.
- [ ] Medewerkerdetail ondersteunt werkdag-selectie en multiselect voorkeurslocaties.
- [ ] Medewerkerdetail ondersteunt meerdere afwezigheidsregels met datum + reden.
