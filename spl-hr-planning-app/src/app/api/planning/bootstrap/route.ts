import { NextResponse } from "next/server";
import {
  fetchMasterWireframe,
  seedPlanningIfEmpty,
} from "@/lib/planning-data";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

export async function GET() {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  try {
    const seededMaster = await seedPlanningIfEmpty(auth.supabase);
    const { locations, employees } = await fetchMasterWireframe(auth.supabase);
    return NextResponse.json({ locations, employees, seededMaster });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
