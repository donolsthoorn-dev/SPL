/**
 * Gedeelde planningslogica voor Next.js (publiek + API) en de wireframe-planner (via /planning-core.js).
 */
import type { WireframeAssignment, WireframeEmployee, WireframeLocation } from "./planning-data";

export type PlanningSnapshot = {
  weekStart: string;
  locations: WireframeLocation[];
  employees: WireframeEmployee[];
  assignments: WireframeAssignment[];
};

export const PLANNING_DAY_PARTS = ["ochtend", "middag"] as const;

const WEEKDAY_TO_SLOT_KEY: Record<number, string> = { 1: "ma", 2: "di", 3: "wo", 4: "do", 5: "vr" };

export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function addDaysToIsoDate(iso: string, deltaDays: number): string {
  const dt = parseIsoDateLocal(iso);
  dt.setDate(dt.getDate() + deltaDays);
  return formatIsoDateLocal(dt);
}

export function getIsoDateForWeekday(weekStart: string, weekday: number): string {
  return addDaysToIsoDate(weekStart, weekday - 1);
}

export function getScheduledHoursForAssignment(
  locations: WireframeLocation[],
  locationId: string,
  weekday: number,
  dayPart: string,
  weekStart: string,
): number {
  const location = locations.find((l) => l.id === locationId);
  if (!location) return 0;
  const dayKey = WEEKDAY_TO_SLOT_KEY[weekday];
  if (!dayKey) return 0;
  const targetDate = addDaysToIsoDate(weekStart, weekday - 1);
  const period = location.periods.find((p) => targetDate >= p.start && targetDate <= p.end);
  if (!period) return 0;
  const slots = period.slots as Record<string, { ochtend?: number; middag?: number }>;
  return Number(slots?.[dayKey]?.[dayPart as "ochtend" | "middag"] || 0);
}

export function getEmployeePlannedHours(snapshot: PlanningSnapshot, employeeId: string): number {
  const hours = snapshot.assignments
    .filter((a) => a.employeeId === employeeId)
    .reduce(
      (total, assignment) =>
        total +
        getScheduledHoursForAssignment(
          snapshot.locations,
          assignment.locationId,
          assignment.weekday,
          assignment.dayPart,
          snapshot.weekStart,
        ),
      0,
    );
  return Math.round(hours * 100) / 100;
}

export function isOpenFromPeriods(
  loc: WireframeLocation | undefined,
  weekday: number,
  dayPart: string,
  weekStart: string,
): boolean {
  if (!loc) return false;
  const dayKey = WEEKDAY_TO_SLOT_KEY[weekday];
  if (!dayKey) return false;
  const targetDate = addDaysToIsoDate(weekStart, weekday - 1);
  return loc.periods.some((period) => {
    const inRange = targetDate >= period.start && targetDate <= period.end;
    if (!inRange) return false;
    const slots = period.slots as Record<string, { ochtend?: number; middag?: number }>;
    return Number(slots?.[dayKey]?.[dayPart as "ochtend" | "middag"] || 0) > 0;
  });
}

export function isOpenFromPeriodsById(
  locations: WireframeLocation[],
  locationId: string,
  weekday: number,
  dayPart: string,
  weekStart: string,
): boolean {
  return isOpenFromPeriods(locations.find((l) => l.id === locationId), weekday, dayPart, weekStart);
}

export function normalizeAbsenceRange(absence: {
  startDate?: string;
  endDate?: string;
  date?: string;
}): { startDate: string; endDate: string } | null {
  const startDate = String(absence.startDate ?? absence.date ?? "").trim();
  const endDateRaw = String(absence.endDate ?? "").trim();
  const endDate = endDateRaw || startDate;
  if (!startDate || !endDate) return null;
  return startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };
}

export function isAbsenceOnDate(
  absence: { startDate?: string; endDate?: string; date?: string },
  dayIso: string,
): boolean {
  const normalized = normalizeAbsenceRange(absence);
  if (!normalized) return false;
  return dayIso >= normalized.startDate && dayIso <= normalized.endDate;
}

export function isDuintopLocation(locations: WireframeLocation[], locationId: string): boolean {
  const location = locations.find((l) => l.id === locationId);
  if (!location) return false;
  return /^duintop\s/i.test(String(location.name || "").trim());
}

export function getTimeslotAssignments(
  assignments: WireframeAssignment[],
  employeeId: string,
  weekday: number,
  dayPart: string,
): WireframeAssignment[] {
  return assignments.filter(
    (a) => a.employeeId === employeeId && a.weekday === weekday && a.dayPart === dayPart,
  );
}

/** Conflict als iemand op 2+ locaties staat, tenzij alle betrokken locaties Duintop zijn. */
export function timeslotHasDuplicateConflict(
  locations: WireframeLocation[],
  assignments: WireframeAssignment[],
  employeeId: string,
  weekday: number,
  dayPart: string,
): boolean {
  const slotAssignments = getTimeslotAssignments(assignments, employeeId, weekday, dayPart);
  if (slotAssignments.length <= 1) return false;
  const locationIds = [...new Set(slotAssignments.map((a) => a.locationId))];
  return !locationIds.every((id) => isDuintopLocation(locations, id));
}

export function hasEmployeeTimeslotConflict(
  locations: WireframeLocation[],
  assignments: WireframeAssignment[],
  employeeId: string,
): boolean {
  const keys = new Set<string>();
  assignments
    .filter((a) => a.employeeId === employeeId)
    .forEach((a) => keys.add(`${a.weekday}-${a.dayPart}`));
  for (const key of keys) {
    const [weekday, dayPart] = key.split("-");
    if (timeslotHasDuplicateConflict(locations, assignments, employeeId, Number(weekday), dayPart)) {
      return true;
    }
  }
  return false;
}

export function isEmployeeAvailableForWeekday(
  snapshot: PlanningSnapshot,
  employee: WireframeEmployee,
  weekday: number,
): boolean {
  if (!employee.days.includes(weekday)) return false;
  const dayIso = getIsoDateForWeekday(snapshot.weekStart, weekday);
  const isAbsent = (employee.absences || []).some((a) => isAbsenceOnDate(a, dayIso));
  if (isAbsent) return false;
  return snapshot.locations.some((loc) =>
    PLANNING_DAY_PARTS.some((dayPart) => isOpenFromPeriods(loc, weekday, dayPart, snapshot.weekStart)),
  );
}

export function isEmployeePlanableForWeekday(
  employee: WireframeEmployee,
  weekday: number,
  weekStart: string,
): boolean {
  if (!employee.days.includes(weekday)) return false;
  const dayIso = getIsoDateForWeekday(weekStart, weekday);
  return !(employee.absences || []).some((a) => isAbsenceOnDate(a, dayIso));
}

export function getEmployeeAbsenceForWeekday(
  employee: WireframeEmployee,
  weekday: number,
  weekStart: string,
): { startDate?: string; endDate?: string; date?: string; reason?: string } | null {
  const dayIso = getIsoDateForWeekday(weekStart, weekday);
  return (employee.absences || []).find((a) => isAbsenceOnDate(a, dayIso)) || null;
}

export function isEmployeeSickForWeekday(
  employee: WireframeEmployee,
  weekday: number,
  weekStart: string,
): boolean {
  const absence = getEmployeeAbsenceForWeekday(employee, weekday, weekStart);
  if (!absence) return false;
  return /ziek/i.test(String(absence.reason || ""));
}

export function isEmployeeOnLeaveForWeekday(
  employee: WireframeEmployee,
  weekday: number,
  weekStart: string,
): boolean {
  const absence = getEmployeeAbsenceForWeekday(employee, weekday, weekStart);
  if (!absence) return false;
  return /verlof/i.test(String(absence.reason || ""));
}

export function getLocationName(locations: WireframeLocation[], id: string): string {
  return locations.find((l) => l.id === id)?.name ?? "-";
}

export function getEmployeeName(employees: WireframeEmployee[], id: string): string {
  return employees.find((e) => e.id === id)?.name ?? "-";
}

export function formatEmployeeNameForLocationCell(
  employee: WireframeEmployee | undefined,
  name: string,
  weekday: number,
  weekStart: string,
): string {
  if (!name || name === "-") return "";
  if (employee && isEmployeeSickForWeekday(employee, weekday, weekStart)) return `${name} (ziek)`;
  if (employee && isEmployeeOnLeaveForWeekday(employee, weekday, weekStart)) return `${name} (verlof)`;
  return name;
}

export function getEmployeeWeekdayDisplayText(
  snapshot: PlanningSnapshot,
  emp: WireframeEmployee,
  weekday: number,
  assignmentSeparator: string,
): string {
  const dayAssignments = snapshot.assignments.filter(
    (a) => a.employeeId === emp.id && a.weekday === weekday,
  );
  const isSickDay = isEmployeeSickForWeekday(emp, weekday, snapshot.weekStart);
  const isLeaveDay = isEmployeeOnLeaveForWeekday(emp, weekday, snapshot.weekStart);
  const assignmentText = dayAssignments
    .map((a) => `${getLocationName(snapshot.locations, a.locationId)} (${a.dayPart})`)
    .join(assignmentSeparator);

  if (!isEmployeePlanableForWeekday(emp, weekday, snapshot.weekStart)) {
    if (isSickDay) return assignmentText ? `${assignmentText} (ziek gemeld)` : "Ziek";
    if (isLeaveDay) return assignmentText ? `${assignmentText} (verlof)` : "Verlof";
    return "Afwezig";
  }
  if (dayAssignments.length === 0) {
    return isEmployeeAvailableForWeekday(snapshot, emp, weekday) ? "Beschikbaar" : "Afwezig";
  }
  if (isSickDay) return `${assignmentText} (ziek gemeld)`;
  if (isLeaveDay) return `${assignmentText} (verlof)`;
  return assignmentText;
}

export function getEmployeeTotalHoursCellClass(planned: number, weekHours: number): string {
  if (planned > weekHours) return "danger";
  if (planned === weekHours) return "ok";
  return "";
}

function dedupeAssignments(assignments: WireframeAssignment[]): WireframeAssignment[] {
  const uniqueByKey = new Map<string, WireframeAssignment>();
  for (const assignment of assignments) {
    const key = [
      assignment.locationId,
      assignment.weekday,
      assignment.dayPart,
      assignment.employeeId,
    ].join("|");
    uniqueByKey.set(key, assignment);
  }
  return [...uniqueByKey.values()];
}

export type ValidateWeekAssignmentsOptions = {
  /** Bij week-kopie: planningsafwijkingen zijn alleen waarschuwingen, geen blokkade. */
  forWeekCopy?: boolean;
};

export type WeekAssignmentsValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

/** Server- en client-validatie vóór opslaan van een week. */
export function validateWeekAssignments(
  snapshot: PlanningSnapshot,
  assignments: WireframeAssignment[],
  options: ValidateWeekAssignmentsOptions = {},
): WeekAssignmentsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { forWeekCopy = false } = options;
  const pushIssue = (message: string) => {
    if (forWeekCopy) warnings.push(message);
    else errors.push(message);
  };
  const deduped = dedupeAssignments(assignments);
  const employeesById = new Map(snapshot.employees.map((e) => [e.id, e]));
  const locationsById = new Map(snapshot.locations.map((l) => [l.id, l]));

  deduped.forEach((a, index) => {
    const loc = locationsById.get(a.locationId);
    const emp = employeesById.get(a.employeeId);
    const label = `Toewijzing ${index + 1}`;
    if (!loc) {
      pushIssue(`${label}: onbekende locatie.`);
      return;
    }
    if (!emp) {
      pushIssue(`${label}: onbekende medewerker.`);
      return;
    }
    if (!isOpenFromPeriods(loc, a.weekday, a.dayPart, snapshot.weekStart)) {
      pushIssue(
        `${label}: ${emp.name} op ${loc.name} (${a.dayPart}) is geen open dagdeel in deze week.`,
      );
    }
  });

  const employeeIds = [...new Set(deduped.map((a) => a.employeeId))];
  for (const employeeId of employeeIds) {
    const emp = employeesById.get(employeeId);
    if (!emp) continue;
    if (hasEmployeeTimeslotConflict(snapshot.locations, deduped, employeeId)) {
      pushIssue(`${emp.name}: dubbele inplanning op hetzelfde dagdeel (conflict).`);
    }
    const planned = getEmployeePlannedHours({ ...snapshot, assignments: deduped }, employeeId);
    if (planned > emp.weekHours) {
      pushIssue(`${emp.name}: ${planned} uur ingepland, meer dan contract (${emp.weekHours} uur).`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
