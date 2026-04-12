# SPL Planningsapp MVP - Datamodel en API-contract

Dit document vertaalt het conceptuele model naar concrete tabellen en endpoints.

## 1) Databasemodel (SQL, relationeel)

Zie ook: `docs/schema.sql`.

### Tabellen
- `locations`
- `location_periods`
- `location_opening_slots`
- `employees`
- `employee_availabilities`
- `employee_absences`
- `employee_preferences`
- `assignments`
- `publish_batches`
- `publish_batch_assignments`
- `audit_logs`

### Belangrijke constraints
- Geen dubbele opening-slot voor dezelfde periodedag+dagdeel.
- Geen dubbele inzet per medewerker op zelfde datum+dagdeel.
- Alleen dagdelen `ochtend` en `middag`.
- Contractlimieten opgeslagen per medewerker (default 22.5/4.5/5).

## 2) API-entiteiten

## Locaties
- `GET /api/locations`
- `POST /api/locations`
- `GET /api/locations/{locationId}`
- `PATCH /api/locations/{locationId}`
- `POST /api/locations/{locationId}/periods`
- `POST /api/location-periods/{periodId}/opening-slots`

## Medewerkers
- `GET /api/employees`
- `POST /api/employees`
- `GET /api/employees/{employeeId}`
- `PATCH /api/employees/{employeeId}`
- `POST /api/employees/{employeeId}/availabilities`
- `POST /api/employees/{employeeId}/absences`
- `POST /api/employees/{employeeId}/preferences`

## Planning
- `GET /api/schedule/location-view?weekStart=YYYY-MM-DD`
- `GET /api/schedule/employee-view?weekStart=YYYY-MM-DD`
- `POST /api/assignments`
- `PATCH /api/assignments/{assignmentId}`
- `DELETE /api/assignments/{assignmentId}`
- `POST /api/assignments/copy-week`

## Suggesties
- `GET /api/suggestions?locationId=...&date=...&dayPart=ochtend|middag`

Response bevat lijst met kandidaten + score + redencodes.

## Publicatie
- `POST /api/publications/publish` (maakt publicatiebatch op basis van conceptplanning)
- `POST /api/publications/unpublish` (deactiveert huidige batch)
- `GET /public/schedule?weekStart=YYYY-MM-DD&view=location|employee`

## 3) JSON shape (samenvatting)

### Assignment
```json
{
  "id": "uuid",
  "date": "2026-05-11",
  "dayPart": "ochtend",
  "hours": 4.5,
  "status": "concept",
  "locationId": "uuid",
  "employeeId": "uuid",
  "conflicts": [
    "outside_availability"
  ]
}
```

### SuggestionCandidate
```json
{
  "employeeId": "uuid",
  "employeeName": "Voorbeeld Naam",
  "score": 86,
  "reasonCodes": [
    "fixed_slot_match",
    "underplanned_hours"
  ]
}
```

## 4) Autorisatie (MVP)

- Rollen:
  - `admin`: volledige CRUD + publiceren.
  - `inzage`: alleen read op interne overzichten.
- Publieke route `/public/schedule` is anoniem en read-only.
