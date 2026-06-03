export function mapEmailSendError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Onbekende fout";
  if (
    raw.includes("RESEND_API_KEY") ||
    raw.includes("SMTP_HOST") ||
    raw.includes("SMTP_PORT") ||
    raw.includes("SMTP_USER") ||
    raw.includes("SMTP_PASS") ||
    raw.includes("SMTP_SECURE") ||
    raw.includes("MAIL_FROM")
  ) {
    return "E-mail is nog niet geconfigureerd op de server. Zet RESEND_API_KEY (Resend) of SMTP-* variabelen in .env.local / Vercel en redeploy.";
  }
  if (raw.includes("PUBLIC_APP_BASE_URL")) {
    return "PUBLIC_APP_BASE_URL ontbreekt. Voeg deze toe aan .env.local en herstart de app.";
  }
  if (raw.includes("PUBLIC_LINK_SIGNING_SECRET")) {
    return "PUBLIC_LINK_SIGNING_SECRET ontbreekt. Voeg deze toe aan .env.local en herstart de app.";
  }
  if (
    raw.includes("spl_employees") &&
    (raw.includes("private_email") || raw.includes("planning_email_is_private"))
  ) {
    return "Databasekolommen voor medewerker e-mail ontbreken. Voer in Supabase SQL Editor uit: supabase-migrate-employee-dual-email.sql";
  }
  if (raw.includes("spl_planning_email")) {
    return "E-mailwachtrij ontbreekt in de database. Voer in Supabase SQL Editor uit: supabase-planning-email-queue.sql";
  }
  return raw;
}
