import { NextResponse, type NextRequest } from "next/server";
import { fetchWeekState } from "@/lib/planning-data";
import { mapEmailSendError } from "@/lib/planning-email-api";
import {
  createPlanningEmailDispatch,
  getEmailDispatchStatus,
} from "@/lib/planning-email-queue";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseWeekStart(request: NextRequest): string | null {
  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart || !WEEK_RE.test(weekStart)) return null;
  return weekStart;
}

function parseMode(request: NextRequest): "full" | "catchup" {
  const mode = request.nextUrl.searchParams.get("mode");
  return mode === "catchup" ? "catchup" : "full";
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
    const status = await getEmailDispatchStatus(auth.supabase, weekStart, "employee");
    return NextResponse.json({
      weekStart,
      published: Boolean(week.published),
      eligibleCount: status.eligibleCount,
      deliveredCount: status.deliveredCount,
      catchupCount: status.catchupCount,
      activeDispatch: status.activeDispatch,
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

  const mode = parseMode(request);

  try {
    const week = await fetchWeekState(auth.supabase, weekStart);
    if (!week.published) {
      return NextResponse.json({ error: "Publiceer eerst de planning voor deze week." }, { status: 400 });
    }

    const created = await createPlanningEmailDispatch(auth.supabase, {
      weekStart,
      audience: "employee",
      mode,
    });

    if (!created.dispatchId) {
      return NextResponse.json({
        ok: true,
        dispatchId: null,
        total: 0,
        skipped: created.skipped,
        pending: 0,
        message:
          created.skipped > 0
            ? "Alle medewerkers met e-mail hebben deze planning al ontvangen."
            : "Geen medewerkers met e-mailadres.",
      });
    }

    return NextResponse.json({
      ok: true,
      dispatchId: created.dispatchId,
      total: created.total,
      skipped: created.skipped,
      pending: created.pending,
      mode,
    });
  } catch (e) {
    const message = mapEmailSendError(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
