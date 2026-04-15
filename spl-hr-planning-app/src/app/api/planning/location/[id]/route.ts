import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { WireframePeriod } from "@/lib/planning-data";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

const periodSchema = z.object({
  start: z.string(),
  end: z.string(),
  slots: z.record(
    z.string(),
    z.object({
      ochtend: z.number(),
      middag: z.number(),
    }),
  ),
});

const patchSchema = z.object({
  name: z.string().min(1),
  place: z.string().min(1),
  email: z.string().max(320).optional().nullable(),
  minEmployees: z.number().int().min(1),
  maxEmployees: z.number().int().min(1),
  periods: z.array(periodSchema).min(1),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige payload" }, { status: 400 });
  }

  const rawEmail = parsed.data.email;
  const emailTrim =
    rawEmail === null || rawEmail === undefined ? "" : String(rawEmail).trim();
  const email = emailTrim === "" ? null : emailTrim;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }
  if (parsed.data.maxEmployees < parsed.data.minEmployees) {
    return NextResponse.json(
      { error: "Maximum bezetting moet groter of gelijk zijn aan minimum bezetting." },
      { status: 400 },
    );
  }

  try {
    const { error: uErr } = await auth.supabase
      .from("spl_locations")
      .update({
        name: parsed.data.name,
        place: parsed.data.place,
        email,
        min_employees: parsed.data.minEmployees,
        max_employees: parsed.data.maxEmployees,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (uErr) throw uErr;

    const { error: dErr } = await auth.supabase.from("spl_location_periods").delete().eq("location_id", id);
    if (dErr) throw dErr;

    const periods = parsed.data.periods as WireframePeriod[];
    for (let p = 0; p < periods.length; p++) {
      const period = periods[p]!;
      const { error: iErr } = await auth.supabase.from("spl_location_periods").insert({
        location_id: id,
        start_date: period.start,
        end_date: period.end,
        slots: period.slots,
        sort_order: p,
      });
      if (iErr) throw iErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  }

  try {
    const { data: emps, error: listErr } = await auth.supabase
      .from("spl_employees")
      .select("id, preferred_location_ids");
    if (listErr) throw listErr;

    for (const emp of emps || []) {
      const pref = emp.preferred_location_ids as string[] | null;
      if (!pref?.includes(id)) continue;
      const next = pref.filter((x) => x !== id);
      const { error: upErr } = await auth.supabase
        .from("spl_employees")
        .update({ preferred_location_ids: next, updated_at: new Date().toISOString() })
        .eq("id", emp.id);
      if (upErr) throw upErr;
    }

    const { error: delErr } = await auth.supabase.from("spl_locations").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
