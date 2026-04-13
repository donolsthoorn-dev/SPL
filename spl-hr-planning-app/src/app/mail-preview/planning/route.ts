import { buildPlanningPublishEmailHtml } from "@/lib/planning-email";
import { requirePlanningApiUser } from "@/lib/planning-api-auth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    const auth = await requirePlanningApiUser();
    if (!auth.ok) return auth.response;
  }

  const html = buildPlanningPublishEmailHtml({
    recipientName: "Voorbeeld medewerker",
    weekStart: "2026-04-13",
    planTitle: "SPL planning week 16",
    notes: "Dit is een voorbeeldmail voor de opmaakcontrole.\nJe kunt deze template later inhoudelijk aanpassen.",
    publicLink: "http://localhost:3000/publieke-planning?t=voorbeeldtoken",
    logoUrl: "http://localhost:3000/mail/spl-logo.png",
    audience: "employee",
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
