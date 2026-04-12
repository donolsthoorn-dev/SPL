import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetchWeekState, saveWeekState } from "@/lib/planning-data";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

const assignmentSchema = z.object({
  locationId: z.string().uuid(),
  weekday: z.number().int().min(1).max(5),
  dayPart: z.enum(["ochtend", "middag"]),
  employeeId: z.string().uuid(),
});

const putBodySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  published: z.boolean(),
  assignments: z.array(assignmentSchema),
});

export async function GET(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart verplicht (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const data = await fetchWeekState(auth.supabase, weekStart);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await saveWeekState(
      auth.supabase,
      parsed.data.weekStart,
      parsed.data.published,
      parsed.data.assignments,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
