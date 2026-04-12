import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Onbekende fout";
}

const patchSchema = z.object({
  name: z.string().min(1),
  email: z.email().optional().or(z.literal("")),
  contractType: z.string().min(1),
  weekHours: z.number().positive(),
  endDate: z.string(),
  days: z.array(z.number().int().min(1).max(5)).min(1),
  preferredLocationIds: z.array(z.string().uuid()),
  absences: z.array(
    z.object({
      date: z.string(),
      reason: z.string(),
    }),
  ),
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

  try {
    const { error: uErr } = await auth.supabase
      .from("spl_employees")
      .update({
        name: parsed.data.name,
        email: parsed.data.email || null,
        contract_type: parsed.data.contractType,
        week_hours: parsed.data.weekHours,
        end_date: parsed.data.endDate || null,
        days: parsed.data.days,
        preferred_location_ids: parsed.data.preferredLocationIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (uErr) throw uErr;

    const { error: dErr } = await auth.supabase.from("spl_employee_absences").delete().eq("employee_id", id);
    if (dErr) throw dErr;

    for (const a of parsed.data.absences) {
      if (!a.date) continue;
      const { error: iErr } = await auth.supabase.from("spl_employee_absences").insert({
        employee_id: id,
        absence_date: a.date,
        reason: a.reason || "Ziek",
      });
      if (iErr) throw iErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    let message = getErrorMessage(e);
    if (
      (message.includes("column") && message.includes("email") && message.includes("does not exist")) ||
      (message.includes("schema cache") && message.includes("'email'") && message.includes("spl_employees"))
    ) {
      message =
        "Databasekolom spl_employees.email ontbreekt. Voer in Supabase SQL Editor uit: alter table public.spl_employees add column if not exists email text;";
    }
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
    const { error: delErr } = await auth.supabase.from("spl_employees").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = getErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
