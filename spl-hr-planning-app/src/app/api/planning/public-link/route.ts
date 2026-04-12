import { NextResponse, type NextRequest } from "next/server";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";
import { createPublicPlanningToken } from "@/lib/public-planning-token";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

function resolveBaseUrl(request: NextRequest): string {
  const configured = process.env.PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const auth = await requirePlanningApiUser();
  if (!auth.ok) return auth.response;

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  if (!weekStart || !WEEK_RE.test(weekStart)) {
    return NextResponse.json({ error: "Ongeldige weekStart" }, { status: 400 });
  }
  if (!employeeId || !UUID_RE.test(employeeId)) {
    return NextResponse.json({ error: "Ongeldige employeeId" }, { status: 400 });
  }

  try {
    const token = createPublicPlanningToken(weekStart, employeeId);
    const link = `${resolveBaseUrl(request)}/publieke-planning?t=${encodeURIComponent(token)}`;
    return NextResponse.json({ link });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Link genereren mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
