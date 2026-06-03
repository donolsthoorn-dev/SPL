import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";
import { registerPlanningEmailDeliveries } from "@/lib/planning-email-queue";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z.object({
  weekStart: z.string().regex(WEEK_RE),
  audience: z.enum(["employee", "location"]),
  recipientIds: z.array(z.string().uuid()).min(1),
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige payload" }, { status: 400 });
  }

  try {
    const result = await registerPlanningEmailDeliveries(auth.supabase, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
