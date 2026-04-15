# SPL Planningsapp MVP - Businessregels

Dit document legt de definitieve harde en zachte regels vast voor planning, controles en suggesties.

## 1. Definities

- Dagdelen: `ochtend`, `middag`.
- Werkweek: maandag tot en met vrijdag.
- Doelbezetting per open dagdeel wordt per locatie vastgelegd: `min_employees` en `max_employees` (standaard 2-4).
- Contracttypen: `vast`, `oproepkracht`.

## 2. Harde regels (must-pass)

Een toewijzing is ongeldig als een van onderstaande regels wordt geschonden.

1. **Openingsregel**
   - Toewijzen kan alleen als locatie op die datum en dat dagdeel open is.
2. **Afwezigheidsregel**
   - Medewerker mag niet worden ingepland op afwezige datum/dagdeel.
3. **Dubbele inzet**
   - Medewerker mag niet op dezelfde datum + dagdeel op meerdere locaties staan.
4. **Werkdagregel**
   - Medewerker mag alleen ingepland worden op eigen beschikbare werkdagen.
5. **Daglimiet**
   - Maximaal 4.5 uur inzet per dag per medewerker.
6. **Weeklimiet**
   - Maximaal 22.5 uur per week per medewerker (tenzij individueel afwijkend).
7. **Max dagen**
   - Maximaal 5 werkdagen per week.

## 3. Zachte regels (voorkeuren)

Zachte regels sturen de suggestie-engine, maar blokkeren niet.

1. Vaste locatie + vast dagdeel heeft sterke voorkeur.
2. Vaste locatie heeft voorkeur boven niet-vaste locatie.
3. Vaste kracht heeft voorkeur boven oproepkracht als beide geschikt zijn.
4. Medewerker met onderplanning krijgt voorrang.
5. Stabiliteit: voorkom onnodige wisselingen van week op week.

## 4. Prioriteitsvolgorde bij automatische suggesties

De ranking wordt bepaald in deze volgorde:

1. Voldoet aan alle harde regels.
2. Match op vaste locatie + dagdeel.
3. Match op vaste locatie.
4. Contracttype `vast`.
5. Grootste negatieve urensaldo (meest ondergepland).
6. Minste recente wisselingen.
7. Alfabetische tie-breaker op naam.

## 5. Signaleringsregels in UI

## Locatieplanning
- **Rood:** bezetting < locatie-minimum of > locatie-maximum.
- **Oranje:** bezetting ok, maar minimaal 1 conflictwaarschuwing aanwezig.
- **Groen:** bezetting binnen locatie-minimum/-maximum zonder conflict.

## Medewerkerplanning
- **Rood:** over daglimiet/over weeklimiet/dubbele inzet.
- **Oranje:** onder contracturen of inzet buiten voorkeurslocatie.
- **Groen:** binnen limieten en zonder conflict.

## 6. Publicatie

- Alleen planningstatus `gepubliceerd` komt op de openbare inzagepagina.
- Conceptwijzigingen blijven intern zichtbaar totdat expliciet gepubliceerd.

## 7. Conflictafhandeling

- Bij handmatige planning met harde rule breach:
  - standaard blokkeren en foutmelding tonen.
  - optioneel admin-override mogelijk voor uitzondering.
- Bij gelijktijdige wijzigingen:
  - recordversie controleren.
  - bij versieconflict gebruiker laten herladen en opnieuw toepassen.

## 8. Uitleg bij suggesties

Elke voorgestelde medewerker bevat redencodes, bijvoorbeeld:
- `fixed_slot_match`
- `fixed_location_match`
- `underplanned_hours`
- `stable_assignment`
- `fallback_oproepkracht`
