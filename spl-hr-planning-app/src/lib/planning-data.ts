import type { SupabaseClient } from "@supabase/supabase-js";

export type DaySlots = {
  ochtend: number;
  middag: number;
};

export type WireframePeriod = {
  start: string;
  end: string;
  slots: Record<string, DaySlots>;
};

export type WireframeLocation = {
  id: string;
  name: string;
  place: string;
  periods: WireframePeriod[];
};

export type WireframeEmployee = {
  id: string;
  name: string;
  email?: string;
  contractType: string;
  weekHours: number;
  endDate: string;
  days: number[];
  preferredLocationIds: string[];
  absences: { date: string; reason: string }[];
};

export type WireframeAssignment = {
  locationId: string;
  weekday: number;
  dayPart: string;
  employeeId: string;
};

/** Zelfde stamdata als het oorspronkelijke prototype (wireframe.js). */
export function buildPrototypeMasterData(): {
  locations: WireframeLocation[];
  employees: WireframeEmployee[];
} {
  const locationNames = [
    "Apollo (Montessori)",
    "Astronaut",
    "Boerderij",
    "Boschfluiters",
    "De Ballon",
    "De Mors",
    "Duimelot",
    "Floddertje",
    "Gouden Poort (antroposofisch)",
    "Groenknollenland",
    "Het Gebouw - Groep 1: Rood",
    "Het Gebouw - Groep 2: blauw",
    "Het Gebouw - Groep 3: groen",
    "Het Gebouw - Groep 4: geel",
    "Hooiberg",
    "Jippie",
    "Kleine Urt",
    "Kwetternest",
    "Leistroom",
    "Mengelmoes",
    "Merenwijk",
    "Morgenster Noordwijk",
    "Olleke Bolleke 1",
    "Olleke Bolleke 2",
    "Ot en Sien",
    "Peuterspeelklas Gebouw",
    "Pippeloen",
    "Pippeloentje",
    "Piraatje",
    "Piraatje Lisse PSZ",
    "Piramide 2",
    "Steffie",
    "Zuid-West",
  ];

  const employeeNames = [
    "Adriena Brandt",
    "Andrea Ouwehand",
    "Angela Groenendijk",
    "Angelique Tetteroo",
    "Annemieke vd Heide",
    "Arlette van Iepenburg",
    "Astrid Volders",
    "Bianca Bergman",
    "Brenda Kulk",
    "Caroline Verhoef",
    "Cynthia Zwitselaar",
    "Danielle v Beek",
    "Derya Pekmez",
    "Diana Zuiderduin",
    "Dounia Abbassi",
    "Ellen",
    "Erna Vergunst",
    "Eva de Haan",
    "Gaby S",
    "Gaby van Kooperen",
    "Gerarda Blom",
    "Hicran Hoke",
    "Irene v Osnabrugge",
    "Iris Dekker",
    "Jacqueline",
    "Jacqueline Carree",
    "Jeanette v Tongeren",
    "Jessica vd Berg",
    "Jorina",
    "Jorine",
    "José van Duuren",
    "Juliana Dijkhuizen",
    "Kamla Maatoug",
    "Karen vd Zaag",
    "Karin Ouwerkerk",
    "Kelly Peters",
    "Kimberly Weeda",
    "Laura Ouwehand",
    "Leerling Doortje Bos",
    "Lianne Molkenboer",
    "Linda Brabander",
    "Linda de Hoop",
    "Linda de J",
    "Linda Mastboom",
    "Marente Helmer",
    "Margriet Sieppe",
    "Maria Mizab",
    "Marian Rotteveel",
    "Marije Burggraaf",
    "Marike",
    "Marit Kwast",
    "Mary Overbeek",
    "Melissa Streeder",
    "Mendy Wijnands",
    "Miranda",
    "Mirjam Jansen",
    "Monique",
    "Monique van Leeuwen",
    "Naomi Bakker",
    "Nadia Abid",
    "Nadira Chirai Gaier",
    "Nanda v Buuren",
    "Nefissa Achour",
    "Nuran Baran",
    "Patricia Kort",
    "Patricia vd Pols",
    "Pinar Arslan",
    "Rachida Lamzira",
    "Renuka de Weijer",
    "Rian Meeuwenberg",
    "Rosa Verplancke",
    "Samira Chabab",
    "Sandra Zuiderduin",
    "Samantha Verplancke",
    "Semanur",
    "Semanur Kasapoglu",
    "Sheila Kops",
    "Sozdar Yuce",
    "Tamar Zaal",
    "Tessa van der Plas",
    "Wafae Baghat",
    "Willyanne vd Oever",
    "Wobke vd Bent",
    "Yasmina Serraj",
    "Yvonne van Rooijen",
    "Zaineb Mouhtaj",
  ];

  const defaultDayPatterns = [
    [1, 2, 3, 4, 5],
    [1, 2, 3, 4],
    [1, 2, 4, 5],
    [1, 3, 5],
    [2, 3, 4],
    [1, 2, 3],
    [3, 4, 5],
  ];

  const locations: WireframeLocation[] = locationNames.map((name, i) => ({
    id: `loc_${i + 1}`,
    name,
    place: name.includes("Noordwijk") ? "Leiden" : "Leiden",
    periods: [
      {
        start: "2026-04-01",
        end: "2026-12-31",
        slots: {
          ma: { ochtend: 4.5, middag: 4.5 },
          di: { ochtend: i === 0 ? 0 : 4.5, middag: i === 0 ? 0 : 4.5 },
          wo: { ochtend: 4.5, middag: 4.5 },
          do: { ochtend: i === 0 ? 0 : 4.5, middag: i === 0 ? 0 : 4.5 },
          vr: { ochtend: 4.5, middag: 4.5 },
        },
      },
    ],
  }));

  locations.forEach((location) => {
    (["ma", "di", "wo", "do", "vr"] as const).forEach((day) => {
      location.periods[0].slots[day].middag = 0;
      location.periods[0].slots[day].ochtend = 4.5;
    });
  });

  const gebouwMiddag = new Set(["Het Gebouw - Groep 3: groen", "Het Gebouw - Groep 4: geel"]);
  locations.forEach((location) => {
    if (!gebouwMiddag.has(location.name)) return;
    (["ma", "di", "wo", "do", "vr"] as const).forEach((day) => {
      location.periods[0].slots[day].ochtend = 0;
      location.periods[0].slots[day].middag = 4.5;
    });
  });

  const employees: WireframeEmployee[] = employeeNames.map((name, i) => ({
    id: `emp_${i + 1}`,
    name,
    email: undefined,
    contractType: i % 6 === 0 ? "Inval" : "Vast",
    weekHours: i % 5 === 0 ? 18 : 22.5,
    endDate: "",
    days: defaultDayPatterns[i % defaultDayPatterns.length]!,
    preferredLocationIds: i % 4 === 0 ? ["loc_1", "loc_2"] : ["loc_1"],
    absences: [],
  }));

  return { locations, employees };
}

export async function seedPlanningIfEmpty(supabase: SupabaseClient): Promise<boolean> {
  const { count, error: countErr } = await supabase
    .from("spl_locations")
    .select("*", { count: "exact", head: true });
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return false;

  const { locations, employees } = buildPrototypeMasterData();
  const locIdByOld = new Map<string, string>();

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i]!;
    const { data: locRow, error } = await supabase
      .from("spl_locations")
      .insert({
        name: loc.name,
        place: loc.place,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) throw error;
    locIdByOld.set(loc.id, locRow.id);

    for (let p = 0; p < loc.periods.length; p++) {
      const period = loc.periods[p]!;
      const { error: pe } = await supabase.from("spl_location_periods").insert({
        location_id: locRow.id,
        start_date: period.start,
        end_date: period.end,
        slots: period.slots,
        sort_order: p,
      });
      if (pe) throw pe;
    }
  }

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]!;
    const pref = (emp.preferredLocationIds || [])
      .map((id) => locIdByOld.get(id))
      .filter((x): x is string => Boolean(x));

    const { data: empRow, error } = await supabase
      .from("spl_employees")
      .insert({
        name: emp.name,
        email: emp.email || null,
        contract_type: emp.contractType,
        week_hours: emp.weekHours,
        end_date: emp.endDate || null,
        days: emp.days,
        preferred_location_ids: pref,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) throw error;

    for (const a of emp.absences || []) {
      const { error: ae } = await supabase.from("spl_employee_absences").insert({
        employee_id: empRow.id,
        absence_date: a.date,
        reason: a.reason || "Ziek",
      });
      if (ae) throw ae;
    }
  }

  return true;
}

export async function fetchMasterWireframe(supabase: SupabaseClient): Promise<{
  locations: WireframeLocation[];
  employees: WireframeEmployee[];
}> {
  const { data: locs, error: lErr } = await supabase
    .from("spl_locations")
    .select("*")
    .order("sort_order", { ascending: true });
  if (lErr) throw lErr;

  const { data: periods, error: pErr } = await supabase
    .from("spl_location_periods")
    .select("*")
    .order("sort_order", { ascending: true });
  if (pErr) throw pErr;

  const { data: emps, error: eErr } = await supabase
    .from("spl_employees")
    .select("*")
    .order("sort_order", { ascending: true });
  if (eErr) throw eErr;

  const { data: absences, error: aErr } = await supabase.from("spl_employee_absences").select("*");
  if (aErr) throw aErr;

  const periodsByLoc = new Map<string, typeof periods>();
  for (const p of periods || []) {
    const list = periodsByLoc.get(p.location_id) || [];
    list.push(p);
    periodsByLoc.set(p.location_id, list);
  }

  const absByEmp = new Map<string, { date: string; reason: string }[]>();
  for (const a of absences || []) {
    const list = absByEmp.get(a.employee_id) || [];
    list.push({ date: a.absence_date, reason: a.reason });
    absByEmp.set(a.employee_id, list);
  }

  const locations: WireframeLocation[] = (locs || []).map((row) => ({
    id: row.id,
    name: row.name,
    place: row.place,
    periods: (periodsByLoc.get(row.id) || []).map((per) => ({
      start: per.start_date,
      end: per.end_date,
      slots: per.slots as WireframePeriod["slots"],
    })),
  }));

  const employees: WireframeEmployee[] = (emps || []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    contractType: row.contract_type,
    weekHours: Number(row.week_hours),
    endDate: row.end_date ?? "",
    days: row.days,
    preferredLocationIds: row.preferred_location_ids ?? [],
    absences: absByEmp.get(row.id) ?? [],
  }));

  return { locations, employees };
}

/** Alleen vullen als de week in de DB op gepubliceerd staat; anders null. */
export async function fetchPublishedWeekSnapshot(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<{
  locations: WireframeLocation[];
  employees: WireframeEmployee[];
  assignments: WireframeAssignment[];
} | null> {
  const weekState = await fetchWeekState(supabase, weekStart);
  if (!weekState.published) return null;
  const { locations, employees } = await fetchMasterWireframe(supabase);
  return {
    locations,
    employees,
    assignments: weekState.assignments,
  };
}

export async function fetchWeekState(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<{ published: boolean; assignments: WireframeAssignment[] }> {
  const { data: week } = await supabase
    .from("spl_planning_weeks")
    .select("published")
    .eq("week_start", weekStart)
    .maybeSingle();

  const { data: rows, error } = await supabase
    .from("spl_planning_assignments")
    .select("*")
    .eq("week_start", weekStart);
  if (error) throw error;

  return {
    published: week?.published ?? false,
    assignments: (rows || []).map((r) => ({
      locationId: r.location_id,
      weekday: r.weekday,
      dayPart: r.day_part,
      employeeId: r.employee_id,
    })),
  };
}

export async function fetchPublishedWeekStarts(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("spl_planning_weeks")
    .select("week_start")
    .eq("published", true)
    .order("week_start", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.week_start);
}

/** Gepubliceerde weken waarin deze medewerker minstens één dienst heeft, chronologisch oplopend. */
export async function fetchPublishedWeekStartsForEmployee(
  supabase: SupabaseClient,
  employeeId: string,
): Promise<string[]> {
  const { data: rows, error } = await supabase
    .from("spl_planning_assignments")
    .select("week_start")
    .eq("employee_id", employeeId);
  if (error) throw error;
  const distinct = [...new Set((rows || []).map((r) => r.week_start))];
  if (distinct.length === 0) return [];
  const { data: weeks, error: wErr } = await supabase
    .from("spl_planning_weeks")
    .select("week_start")
    .eq("published", true)
    .in("week_start", distinct);
  if (wErr) throw wErr;
  const published = new Set((weeks || []).map((w) => w.week_start));
  return distinct.filter((w) => published.has(w)).sort((a, b) => a.localeCompare(b));
}

export async function saveWeekState(
  supabase: SupabaseClient,
  weekStart: string,
  published: boolean,
  assignments: WireframeAssignment[],
): Promise<void> {
  const { error: uErr } = await supabase.from("spl_planning_weeks").upsert(
    {
      week_start: weekStart,
      published,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "week_start" },
  );
  if (uErr) throw uErr;

  const { error: dErr } = await supabase
    .from("spl_planning_assignments")
    .delete()
    .eq("week_start", weekStart);
  if (dErr) throw dErr;

  if (assignments.length === 0) return;

  const { error: iErr } = await supabase.from("spl_planning_assignments").insert(
    assignments.map((a) => ({
      week_start: weekStart,
      location_id: a.locationId,
      weekday: a.weekday,
      day_part: a.dayPart,
      employee_id: a.employeeId,
    })),
  );
  if (iErr) throw iErr;
}
