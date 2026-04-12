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

In het Vercel-project onder **Settings → Environment Variables** (Production):

| Variabele | Waarde |
|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | uit Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | uit Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (geheim) |
| `PUBLIC_LINK_SIGNING_SECRET` | lange random string (zelfde als lokaal; anders worden oude maillinks ongeldig) |
| `PUBLIC_APP_BASE_URL` | **`https://jouw-domein.nl`** (zonder slash aan het eind; zo staan links in mail goed) |
| `SMTP_HOST` | bijv. `smtp.gmail.com` |
| `SMTP_PORT` | `465` (Gmail SSL) of `587` (STARTTLS) |
| `SMTP_SECURE` | `true` bij poort 465, `false` bij 587 |
| `SMTP_USER` | je Gmail-adres |
| `SMTP_PASS` | Gmail **app-wachtwoord** (geen normaal wachtwoord) |
| `MAIL_FROM` | bijv. `"SPL Planning <jouw@gmail.com>"` |

Na elke wijziging: **Redeploy**. Controleer in TransIP dat het domein naar Vercel wijst (A/CNAME zoals Vercel aangeeft).

Als `PUBLIC_APP_BASE_URL` leeg blijft, gebruikt de app op Vercel automatisch `VERCEL_URL` (vaak `*.vercel.app`). Voor nette links in mail: zet altijd je eigen domein in `PUBLIC_APP_BASE_URL`.

## Volgende stap voor productie

- Medewerkersweergave toevoegen met publieke/platte deel-link per week
- Audit log voor wijzigingen
- (Optioneel) retry-queue voor e-mail notificaties
