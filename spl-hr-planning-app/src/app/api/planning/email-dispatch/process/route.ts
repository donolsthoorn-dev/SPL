import { NextResponse, type NextRequest } from "next/server";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";
import { processPlanningEmailDispatchChunk } from "@/lib/planning-email-queue";

export const maxDuration = 120;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const dispatchId = request.nextUrl.searchParams.get("dispatchId")?.trim();
  if (!dispatchId || !UUID_RE.test(dispatchId)) {
    return NextResponse.json({ error: "Ongeldige dispatchId" }, { status: 400 });
  }

  try {
    const result = await processPlanningEmailDispatchChunk(auth.supabase, dispatchId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
