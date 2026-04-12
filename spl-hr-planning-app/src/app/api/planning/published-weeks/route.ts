import { NextResponse } from "next/server";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";
import { fetchPublishedWeekStarts } from "@/lib/planning-data";

export async function GET() {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  try {
    const weeks = await fetchPublishedWeekStarts(auth.supabase);
    return NextResponse.json({ weeks });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
