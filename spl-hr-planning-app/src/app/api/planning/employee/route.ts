import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { WireframeEmployee } from "@/lib/planning-data";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Onbekende fout";
}

const postSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email().optional().or(z.literal("")),
  contractType: z.enum(["Vast", "Inval"]).optional(),
  weekHours: z.number().positive().max(60).optional(),
  endDate: z.string().optional(),
  days: z.array(z.number().int().min(1).max(5)).min(1).optional(),
  preferredLocationIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige payload" }, { status: 400 });
  }

  const contractType = parsed.data.contractType ?? "Vast";
  const weekHours = parsed.data.weekHours ?? 22.5;
  const endDate = parsed.data.endDate ?? "";
  const days = parsed.data.days ?? [1, 2, 3, 4, 5];
  const preferredLocationIds = parsed.data.preferredLocationIds ?? [];

  try {
    const { data: last } = await auth.supabase
      .from("spl_employees")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (last?.sort_order ?? -1) + 1;

    const { data: empRow, error: empErr } = await auth.supabase
      .from("spl_employees")
      .insert({
        name: parsed.data.name,
        email: parsed.data.email || null,
        contract_type: contractType,
        week_hours: weekHours,
        end_date: endDate || null,
        days,
        preferred_location_ids: preferredLocationIds,
        sort_order: sortOrder,
      })
      .select("id")
      .single();
    if (empErr) throw empErr;

    const employee: WireframeEmployee = {
      id: empRow.id,
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      contractType,
      weekHours,
      endDate,
      days,
      preferredLocationIds,
      absences: [],
    };

    return NextResponse.json({ employee });
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
