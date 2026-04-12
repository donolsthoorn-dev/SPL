import { NextResponse, type NextRequest } from "next/server";
import { fetchPublishedWeekSnapshot } from "@/lib/planning-data";
import { createServiceSupabase } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart verplicht (YYYY-MM-DD)" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Configuratiefout";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  try {
    const snapshot = await fetchPublishedWeekSnapshot(supabase, weekStart);
    if (!snapshot) {
      return NextResponse.json({ error: "Planning niet gevonden of niet gepubliceerd." }, { status: 404 });
    }
    return NextResponse.json({
      weekStart,
      locations: snapshot.locations,
      employees: snapshot.employees,
      assignments: snapshot.assignments,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
