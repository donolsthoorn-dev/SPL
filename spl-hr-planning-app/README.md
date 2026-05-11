# SPL HR Planning App

Productieklare startbasis voor een HR-planningsapp met:
- Next.js (App Router)
- Supabase Auth (login)
- Postgres tabellen voor weekplanning
- 1 admin-rol via tabel `admin_users`

## Waar staan de bestanden?

Alle applicatiebestanden staan in:

`/Users/donolsthoorn/Documents/SPL/spl-hr-planning-app`

Belangrijk:
- App code: `src/app`
- Supabase helpers: `src/lib/supabase`
- Database SQL: `supabase-schema.sql`

## Starten

1. Maak `.env.local` op basis van `.env.example`:

```bash
cp .env.example .env.local
```

2. Vul in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Maak in Supabase minimaal 1 user aan (Auth > Users), en run daarna `supabase-schema.sql` in de SQL editor.

3b. **Interactieve planning (prototype + database):** run ook `supabase-planning-schema.sql` in de SQL editor. Bij de eerste load van `/planning` worden locaties en medewerkers automatisch gevuld (zelfde set als het oorspronkelijke prototype); weekplanning wordt opgeslagen in `spl_planning_*` tabellen.

3c. Voor e-mailnotificaties bij publiceren:
- vul SMTP variabelen in `.env.local` (zie `.env.example`)
- vul `PUBLIC_APP_BASE_URL` en `PUBLIC_LINK_SIGNING_SECRET`
- zet e-mailadressen in `spl_employees.email` (mag ook later, bestaande records blijven geldig)

4. Geef die user admin-rechten:

```sql
insert into public.admin_users (user_id)
values ('<auth_user_uuid>');
```

5. Start lokaal:

```bash
npm run dev
```

Open daarna:
- `http://localhost:3000/login`
- na login: `http://localhost:3000/planning` (interactief prototype uit `public/prototype/`)
- database-weekplanning: `http://localhost:3000/dashboard`

## Probleem: "Geen admin toegang" terwijl je wél in `admin_users` staat

De eerste versie van het schema had een RLS-policy op `admin_users` die naar zichzelf keek; daardoor kan de app je rij niet zien. Voer in de SQL Editor uit: `supabase-fix-admin-users-rls.sql` (of gebruik de huidige `supabase-schema.sql` voor nieuwe projecten).

## Vercel + eigen domein (TransIP) + mail

### Resend + `spl-planning.nl` (aanbevolen)

1. **[Resend](https://resend.com)** → inloggen → **Domains** → **Add domain** → `spl-planning.nl`.
2. Zet de voorgestelde **DNS-records** (meestal TXT/CNAME voor DKIM en SPF) bij je DNS-provider (TransIP of waar `spl-planning.nl` wordt beheerd). Wacht tot Resend de status **Verified** toont.
3. **API Keys** → **Create API Key** (Sending access is genoeg) → kopieer de key.
4. In **Vercel** → Project → **Settings** → **Environment Variables** (Production):

| Variabele | Waarde |
|-----------|--------|
| `RESEND_API_KEY` | de key van Resend (`re_...`) |
| `MAIL_FROM` | bijv. `SPL Planning <planning@spl-planning.nl>` (adres moet op het **geverifieerde** domein eindigen) |
| `MAIL_REPLY_TO` | bijv. `planning@spl-planning.nl` |
| `PUBLIC_APP_BASE_URL` | **`https://spl-planning.nl`** (zonder slash aan het eind) |

5. **Verwijder of laat leeg** oude `SMTP_*` variabelen als je alleen Resend gebruikt — zodra `RESEND_API_KEY` staat, pakt de app **Resend** en negeert SMTP.
6. **Redeploy** het project.

### Overige Vercel-variabelen

In hetzelfde scherm horen ook o.a.:

| Variabele | Waarde |
|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | uit Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | uit Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (geheim) |
| `PUBLIC_LINK_SIGNING_SECRET` | lange random string (zelfde als lokaal; anders worden oude maillinks ongeldig) |

### Mail via SMTP (alleen zonder Resend)

Als **`RESEND_API_KEY` leeg** is, gebruikt de app nog **nodemailer + SMTP**:

| Variabele | Waarde |
|-----------|--------|
| `PUBLIC_APP_BASE_URL` | **`https://spl-planning.nl`** (of je eigen URL) |
| `SMTP_HOST` | bijv. `smtp.gmail.com` |
| `SMTP_PORT` | `465` (Gmail SSL) of `587` (STARTTLS) |
| `SMTP_SECURE` | `true` bij poort 465, `false` bij 587 |
| `SMTP_USER` | bij Gmail: je Gmail-adres; bij een andere SMTP-provider het account dat mag versturen |
| `SMTP_PASS` | bij Gmail: **app-wachtwoord** (geen normaal wachtwoord) |
| `MAIL_FROM` | weergavenaam + afzender, bijv. `"SPL Planning <planning@spl-planning.nl>"` |
| `MAIL_REPLY_TO` | bijv. `planning@spl-planning.nl` |

**Afzender vs. SMTP-account:** De app zet `From` en `Reply-To` uit `MAIL_FROM` / `MAIL_REPLY_TO`. Welk adres **Gmail (en veel andere clients) als “echte” afzender toont**, hangt af van de **SMTP-login** (`SMTP_USER`): bij `smtp.gmail.com` ben je ingelogd als je **Gmail-account**, en Google koppelt het bericht daaraan. Daarom zie je vaak nog **donolsthoorn@gmail.com** in het contactkaartje, ook al staat de weergavenaam “SPL opvang”.

**Zo krijg je wél `hr@splopvang.nl` als afzender:**

1. **Gmail blijven gebruiken**   In het Google-account dat bij `SMTP_USER` hoort: **Instellingen → Alle instellingen weergeven → Accounts en import → E-mail verzenden als** → voeg **`hr@splopvang.nl`** toe en rond de verificatie af (link in mailbox van dat adres). Daarna moet `MAIL_FROM` exact dat adres gebruiken, bijv. `SPL opvang <hr@splopvang.nl>`. Zonder deze stap mag Gmail niet “als” dat adres versturen en blijft je Gmail-adres zichtbaar.

2. **Aanbevolen voor organisaties:** SMTP van **je eigen domein** (TransIP e-mail, Microsoft 365 / Exchange, enz.) met een mailbox of verzendaccount **`hr@splopvang.nl`**. Zet dan `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` van die provider; dan klopt afzender en DKIM/SPF meestal ook beter.

Controleer in Vercel dat de variabele **`SMTP_PORT`** heet (niet `MTP_PORT`).

Na elke wijziging: **Redeploy**. Controleer in TransIP dat **spl-planning.nl** (of je app-domein) naar Vercel wijst (A/CNAME zoals Vercel aangeeft). **DNS voor mail (Resend)** zijn extra records naast de website-records.

**Mail vanaf een ander domein (bijv. `splopvang.nl`):** Zelfde stappen: domein in Resend toevoegen en verifiëren, daarna `MAIL_FROM` / `MAIL_REPLY_TO` op adressen onder dat domein zetten.

Als `PUBLIC_APP_BASE_URL` leeg blijft, gebruikt de app op Vercel automatisch `VERCEL_URL` (vaak `*.vercel.app`). Voor nette links in mail: zet je eigen domein in `PUBLIC_APP_BASE_URL`.

## Volgende stap voor productie

- Medewerkersweergave toevoegen met publieke/platte deel-link per week
- Audit log voor wijzigingen
- (Optioneel) retry-queue voor e-mail notificaties

## Incident response

- Runbook voor verdwenen weekdata na kopie-actie: `incident-week-copy-recovery.md`.
