import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { defaultLocationPeriod } from "@/lib/planning-defaults";
import type { WireframeLocation } from "@/lib/planning-data";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

const postSchema = z.object({
  name: z.string().min(1).max(200),
  place: z.string().min(1).max(120),
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

  try {
    const { data: last } = await auth.supabase
      .from("spl_locations")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (last?.sort_order ?? -1) + 1;

    const { data: locRow, error: locErr } = await auth.supabase
      .from("spl_locations")
      .insert({
        name: parsed.data.name,
        place: parsed.data.place,
        sort_order: sortOrder,
      })
      .select("id")
      .single();
    if (locErr) throw locErr;

    const period = defaultLocationPeriod();
    const { error: perErr } = await auth.supabase.from("spl_location_periods").insert({
      location_id: locRow.id,
      start_date: period.start,
      end_date: period.end,
      slots: period.slots,
      sort_order: 0,
    });
    if (perErr) throw perErr;

    const location: WireframeLocation = {
      id: locRow.id,
      name: parsed.data.name,
      place: parsed.data.place,
      periods: [period],
    };

    return NextResponse.json({ location });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
