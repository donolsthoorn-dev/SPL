# SPL Planningsapp MVP - Implementatiefases en testcriteria

Dit is de concrete buildvolgorde op basis van de vastgestelde scope.

## Fase 1 - Fundament (dag 1-2)

Doel:
- Projectbasis, auth-rollen, datamodel en migraties gereed.

Werk:
- Database opzetten met `docs/schema.sql`.
- API-skelet en routing conform `docs/openapi-mvp.yaml`.
- Rollenmodel toevoegen: `admin`, `inzage`.
- Audit logging middleware toevoegen.

Definition of done:
- Alle tabellen en constraints aangemaakt.
- Basis-endpoints reageren met geldige responses.
- Role checks werken op write-endpoints.

## Fase 2 - Stamdata beheer (dag 2-4)

Doel:
- Volledige CRUD voor locaties en medewerkers inclusief periodes/afwezigheid.

Werk:
- Locatiescherm bouwen met periodebeheer en opening-slots.
- Personeelscherm bouwen met beschikbaarheid, afwezigheid, voorkeuren.
- Server-side validaties volgens `docs/02-business-rules.md`.

Definition of done:
- CRUD werkt end-to-end.
- Overlap/uren/datum validaties actief.
- Afwezigheid en beschikbaarheid correct opgeslagen.

## Fase 3 - Planning engine en roosterweergaven (dag 4-7)

Doel:
- Planning per locatie en per medewerker operationeel.

Werk:
- Endpoints voor weekmatrix per locatie en per medewerker.
- Assignment acties: toevoegen, verplaatsen, verwijderen, kopie week.
- Conflict checks op harde regels.

Definition of done:
- Beide weekweergaven laden en bewaren wijzigingen.
- Conflicten worden realtime zichtbaar.
- Kopie-week werkt correct voor gekozen week.

## Fase 4 - Suggesties en publicatie (dag 7-9)

Doel:
- Suggestie-engine en publieke read-only weergave opleveren.

Werk:
- Suggestie-endpoint met scoring en redencodes.
- Publiceer/depubliceer flow met `publish_batches`.
- Publieke pagina met alleen gepubliceerde planning.

Definition of done:
- Suggesties geven topkandidaten met uitleg.
- Publicatie toont juiste data in publieke view.
- Interne conceptdata is niet publiek zichtbaar.

## Fase 5 - UAT en livegang (dag 9-10)

Doel:
- Productierijp maken en gebruikersacceptatie afronden.

Werk:
- UAT met Nanda/teamleiders.
- Kritieke bugs oplossen.
- Korte werkinstructie en overdracht.

Definition of done:
- Alle acceptatiecriteria gehaald.
- Nanda kan zelfstandig weekplanning uitvoeren.
- Publieke link functioneert stabiel.

## Testcriteria (MVP)

Functioneel:
- Locatie met gesloten dagdeel accepteert geen assignment.
- Medewerker op afwezig dagdeel kan niet gepland worden.
- Dubbele inzet op zelfde dagdeel wordt geblokkeerd.
- Onder-/overbezetting kleurt correct in locatieview.
- Onder-/overuren tonen correct in medewerkerview.
- Publicatie toont uitsluitend gepubliceerde records.

Technisch:
- API responses volgen contract uit `docs/openapi-mvp.yaml`.
- Concurrency: versieconflict geeft nette foutmelding.
- Auditlog bevat actor + actie + entiteit.

Gebruikersacceptatie:
- Binnen 30 minuten complete week aanpassen.
- Minimaal 3 realistische reorganisatie-scenario's succesvol gepland.

## Risicobeheersing tijdens bouw

- Dagelijkse review op rule-interpretatie met proceseigenaar.
- Change-freeze op scope na fase 3.
- Back-up/rollback van productieplanning voor publicatieacties.
