# SPL Planningsapp MVP - Schermen en Functionele Scope

Dit document bevestigt per scherm de velden, acties en validaties voor de MVP.

## Scherm A - Locaties (CRUD)

### Lijst
- Kolommen: naam, actief, eerstvolgende wijziging, aantal open dagdelen per week.
- Filters: naam, actief/inactief.
- Acties: nieuwe locatie, detail openen, deactiveren.

### Detail
- Basisvelden: naam, actief.
- Openingstijden per periode:
  - Periode van/tot.
  - Per weekdag: ochtend open + uren, middag open + uren.
  - Sluitingstype (geen, dagdeel gesloten, locatie gesloten).

### Validaties
- Per locatie mogen perioden niet overlappen.
- Uren moeten groter zijn dan 0 als dagdeel open is.
- Een periode moet een geldige range hebben (van <= tot).

## Scherm B - Personeel (CRUD)

### Lijst
- Kolommen: naam, contracttype, actieve werkdagen, geplande uren deze week, status.
- Filters: contracttype, inzetbaar op dag, onder/over uren, actief/inactief.
- Acties: medewerker toevoegen, detail openen, deactiveren.

### Detail
- Basisvelden: naam, contracttype, actief.
- Beschikbaarheid:
  - Werkdagen (ma-vr).
  - Max dagen per week.
  - Max uren per dag.
  - Max uren per week.
- Afwezigheid:
  - Datum.
  - Dagdeel (optioneel: hele dag/ochtend/middag).
  - Reden (ziek, bijzonder verlof).
- Vaste gezichten:
  - Vaste locatie (optioneel).
  - Vaste locatie + dagdeel voorkeur(en) (optioneel).

### Validaties
- Max 5 werkdagen per week.
- Max 4.5 uur per dag.
- Max 22.5 uur per week (tenzij afwijkend contract).
- Afwezigheidsrecords mogen niet dubbel op zelfde datum/dagdeel.

## Scherm C - Bezetting per locatie

### Weergave
- Weekselector.
- Grid: locaties als rijen, per dag 2 subrijen (ochtend/middag), weekdagen als kolommen.
- Cel toont geplande medewerkers en bezettingsstatus.

### Acties
- Medewerker toevoegen aan cel.
- Medewerker verplaatsen tussen cellen.
- Medewerker verwijderen uit cel.
- Vervangen via suggestielijst.
- Snelle acties:
  - kopieer vorige week,
  - leeg dagdeel,
  - herverdeel met suggesties.

### Signalering
- Rood: minder dan 2 of meer dan 4 medewerkers.
- Oranje: exact 3/4 maar met conflictwaarschuwing.
- Conflictlabels:
  - dubbele inzet,
  - afwezigheid,
  - buiten vaste werkdag,
  - urenlimiet bijna bereikt/overschreden.

## Scherm D - Bezetting per medewerker

### Weergave
- Weekselector.
- Grid: medewerkers als rijen, per dag 2 subrijen (ochtend/middag), weekdagen als kolommen.
- Cel toont ingeplande locatie.
- Zijpaneel met totalen: dagen en uren.

### Acties
- Doorklik naar locatiecel voor snelle aanpassing.
- Filteren op ondergepland/overgepland.
- Sorteer op contracttype of naam.

### Signalering
- Onderplanning: minder dan contracturen.
- Overplanning: boven dag- of weeklimiet.
- Dubbele inzet in hetzelfde dagdeel.

## Scherm E - Publieke inzage (read-only)

### Weergave
- Toggle tussen per locatie en per medewerker.
- Weeknavigator.
- Alleen gepubliceerde planning.

### Inhoud
- Zichtbaar: naam medewerker, locatie, dag, dagdeel.
- Niet zichtbaar: afwezigheidsreden, contractdetails, interne notities.

### Acties
- Geen bewerking.
- Admin kan publiceer/depubliceer uitvoeren in adminomgeving.

## Algemene UX- en beheervereisten

- Alle mutaties loggen met: wie, wat, wanneer.
- Duidelijke feedback bij conflict of mislukte opslag.
- Bij gelijktijdig wijzigen: melding met optie herladen en opnieuw toepassen.
