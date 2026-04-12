import type { Metadata } from "next";
import { fetchPublishedWeekSnapshot, fetchPublishedWeekStartsForEmployee } from "@/lib/planning-data";
import { formatWeekPlanLabelNl } from "@/lib/publieke-planning-renderer";
import { createPublicPlanningToken, verifyPublicPlanningToken } from "@/lib/public-planning-token";
import { createServiceSupabase } from "@/lib/supabase/service";
import PubliekePlanningClient, { type PersonalPlanningWeekNav } from "./PubliekePlanningClient";

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

type SearchParams = { week?: string | string[]; t?: string | string[] };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const weekRaw = sp.week;
  const tokenRaw = sp.t;
  const weekParam = Array.isArray(weekRaw) ? weekRaw[0] : weekRaw;
  const tokenParam = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  let verified: ReturnType<typeof verifyPublicPlanningToken> | null = null;
  if (tokenParam) {
    try {
      verified = verifyPublicPlanningToken(tokenParam);
    } catch {
      verified = null;
    }
  }
  const resolvedWeekStart = verified?.weekStart ?? weekParam;
  if (!resolvedWeekStart || !WEEK_RE.test(resolvedWeekStart)) {
    return { title: "Publieke planning | SPL", description: "Gepubliceerde weekplanning (alleen-lezen)" };
  }
  const label = formatWeekPlanLabelNl(resolvedWeekStart);
  if (verified?.audience === "employee") {
    return {
      title: `Persoonlijke planning — ${label} | SPL`,
      description: "Gepubliceerde weekplanning (alleen-lezen)",
    };
  }
  if (verified?.audience === "location") {
    return {
      title: `Locatie planning — ${label} | SPL`,
      description: "Gepubliceerde weekplanning (alleen-lezen)",
    };
  }
  return {
    title: `Publieke planning — ${label} | SPL`,
    description: "Gepubliceerde weekplanning (alleen-lezen)",
  };
}

export default async function PubliekePlanningPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const weekRaw = sp.week;
  const tokenRaw = sp.t;
  const weekParam = Array.isArray(weekRaw) ? weekRaw[0] : weekRaw;
  const tokenParam = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  let verified = null;
  if (tokenParam) {
    try {
      verified = verifyPublicPlanningToken(tokenParam);
    } catch {
      verified = null;
    }
  }
  const resolvedWeekStart = verified?.weekStart ?? weekParam;
  const resolvedWeekOk = Boolean(resolvedWeekStart && WEEK_RE.test(resolvedWeekStart));

  if (!resolvedWeekOk) {
    return (
      <div className="pp-root">
        <p className="pp-muted">Voeg een geldige week toe aan de URL, bijvoorbeeld ?week=2026-04-07</p>
      </div>
    );
  }

  let snapshot;
  let supabase: ReturnType<typeof createServiceSupabase> | undefined;
  try {
    supabase = createServiceSupabase();
    snapshot = await fetchPublishedWeekSnapshot(supabase, resolvedWeekStart!);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Laden mislukt.";
    const isConfig = message.includes("SUPABASE_SERVICE_ROLE_KEY");
    return (
      <div className="pp-root">
        <p className="pp-error">{isConfig ? `${message} Publieke links werken pas na configuratie op de server.` : message}</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="pp-root">
        <p className="pp-error">Planning niet gevonden of niet gepubliceerd.</p>
      </div>
    );
  }

  const restrictedEmployee =
    verified?.audience === "employee"
      ? snapshot.employees.find((employee) => employee.id === verified.employeeId)
      : null;
  const restrictedLocation =
    verified?.audience === "location"
      ? snapshot.locations.find((location) => location.id === verified.locationId)
      : null;

  if (verified?.audience === "employee" && !restrictedEmployee) {
    return (
      <div className="pp-root">
        <p className="pp-error">Deze persoonlijke link is ongeldig of niet meer actief.</p>
      </div>
    );
  }

  if (verified?.audience === "location" && !restrictedLocation) {
    return (
      <div className="pp-root">
        <p className="pp-error">Deze locatie-link is ongeldig of niet meer actief.</p>
      </div>
    );
  }

  let filteredSnapshot;
  if (restrictedEmployee) {
    filteredSnapshot = {
      weekStart: resolvedWeekStart!,
      locations: snapshot.locations,
      employees: [restrictedEmployee],
      assignments: snapshot.assignments.filter((assignment) => assignment.employeeId === restrictedEmployee.id),
    };
  } else if (restrictedLocation) {
    filteredSnapshot = {
      weekStart: resolvedWeekStart!,
      locations: [restrictedLocation],
      employees: snapshot.employees,
      assignments: snapshot.assignments.filter((assignment) => assignment.locationId === restrictedLocation.id),
    };
  } else {
    filteredSnapshot = {
      weekStart: resolvedWeekStart!,
      locations: snapshot.locations,
      employees: snapshot.employees,
      assignments: snapshot.assignments,
    };
  }

  let weekNav: PersonalPlanningWeekNav | undefined;
  if (verified?.audience === "employee" && restrictedEmployee && supabase) {
    try {
      const weeksForEmp = await fetchPublishedWeekStartsForEmployee(supabase, verified.employeeId);
      const idx = weeksForEmp.indexOf(resolvedWeekStart!);
      if (idx !== -1 && weeksForEmp.length > 1) {
        weekNav = {};
        if (idx > 0) {
          const w = weeksForEmp[idx - 1]!;
          weekNav.prev = {
            weekStart: w,
            href: `/publieke-planning?week=${encodeURIComponent(w)}&t=${encodeURIComponent(createPublicPlanningToken(w, verified.employeeId))}`,
          };
        }
        if (idx < weeksForEmp.length - 1) {
          const w = weeksForEmp[idx + 1]!;
          weekNav.next = {
            weekStart: w,
            href: `/publieke-planning?week=${encodeURIComponent(w)}&t=${encodeURIComponent(createPublicPlanningToken(w, verified.employeeId))}`,
          };
        }
      }
    } catch {
      weekNav = undefined;
    }
  }

  return (
    <PubliekePlanningClient
      snapshot={filteredSnapshot}
      personalPlanning={Boolean(restrictedEmployee)}
      locationPlanning={Boolean(restrictedLocation)}
      restrictedEmployeeName={restrictedEmployee?.name}
      restrictedLocationName={restrictedLocation?.name}
      weekNav={weekNav}
    />
  );
}
