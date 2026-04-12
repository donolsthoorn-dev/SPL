import { NextResponse, type NextRequest } from "next/server";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";
import { createPublicLocationPlanningToken, createPublicPlanningToken } from "@/lib/public-planning-token";

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
  const locationId = request.nextUrl.searchParams.get("locationId");
  if (!weekStart || !WEEK_RE.test(weekStart)) {
    return NextResponse.json({ error: "Ongeldige weekStart" }, { status: 400 });
  }
  const hasEmployee = Boolean(employeeId && UUID_RE.test(employeeId));
  const hasLocation = Boolean(locationId && UUID_RE.test(locationId));
  if (!hasEmployee && !hasLocation) {
    return NextResponse.json({ error: "Ongeldige of ontbrekende employeeId of locationId" }, { status: 400 });
  }
  if (hasEmployee && hasLocation) {
    return NextResponse.json({ error: "Kies employeeId of locationId, niet beide" }, { status: 400 });
  }

  try {
    const token = hasEmployee
      ? createPublicPlanningToken(weekStart, employeeId!)
      : createPublicLocationPlanningToken(weekStart, locationId!);
    const link = `${resolveBaseUrl(request)}/publieke-planning?t=${encodeURIComponent(token)}`;
    return NextResponse.json({ link });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Link genereren mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
