import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWeekState } from "@/lib/planning-data";
import { getIsoWeekNumber } from "@/lib/publieke-planning-renderer";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";
import { sendPlanningPublishEmails } from "@/lib/planning-email";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

function mapEmailSendError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Onbekende fout";
  if (
    raw.includes("SMTP_HOST") ||
    raw.includes("SMTP_PORT") ||
    raw.includes("SMTP_USER") ||
    raw.includes("SMTP_PASS") ||
    raw.includes("SMTP_SECURE") ||
    raw.includes("MAIL_FROM")
  ) {
    return "E-mail is nog niet geconfigureerd op de server. Vul de SMTP-instellingen in .env.local in en herstart de app.";
  }
  if (raw.includes("PUBLIC_APP_BASE_URL")) {
    return "PUBLIC_APP_BASE_URL ontbreekt. Voeg deze toe aan .env.local en herstart de app.";
  }
  if (raw.includes("PUBLIC_LINK_SIGNING_SECRET")) {
    return "PUBLIC_LINK_SIGNING_SECRET ontbreekt. Voeg deze toe aan .env.local en herstart de app.";
  }
  return raw;
}

function parseWeekStart(request: NextRequest): string | null {
  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart || !WEEK_RE.test(weekStart)) return null;
  return weekStart;
}

async function getRecipients(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("spl_employees").select("id, name, email");
  if (error) throw error;
  return (data ?? [])
    .filter((r) => typeof r.email === "string" && r.email.trim().length > 0)
    .map((r) => ({ id: r.id, name: r.name, email: (r.email as string).trim() }));
}

export async function GET(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const weekStart = parseWeekStart(request);
  if (!weekStart) {
    return NextResponse.json({ error: "Ongeldige weekStart" }, { status: 400 });
  }

  try {
    const week = await fetchWeekState(auth.supabase, weekStart);
    const recipients = await getRecipients(auth.supabase);
    return NextResponse.json({
      weekStart,
      published: Boolean(week.published),
      eligibleCount: recipients.length,
    });
  } catch (e) {
    const message = mapEmailSendError(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const weekStart = parseWeekStart(request);
  if (!weekStart) {
    return NextResponse.json({ error: "Ongeldige weekStart" }, { status: 400 });
  }

  try {
    const week = await fetchWeekState(auth.supabase, weekStart);
    if (!week.published) {
      return NextResponse.json({ error: "Publiceer eerst de planning voor deze week." }, { status: 400 });
    }
    const recipients = await getRecipients(auth.supabase);
    if (!recipients.length) {
      return NextResponse.json({ error: "Geen medewerkers met e-mailadres." }, { status: 400 });
    }

    const result = await sendPlanningPublishEmails({
      weekStart,
      planTitle: `SPL planning week ${getIsoWeekNumber(weekStart)}`,
      notes: null,
      recipients,
    });
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
