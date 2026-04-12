import type {
  WireframeAssignment,
  WireframeEmployee,
  WireframeLocation,
} from "./planning-data";

export type PublicPlanningSnapshot = {
  weekStart: string;
  locations: WireframeLocation[];
  employees: WireframeEmployee[];
  assignments: WireframeAssignment[];
};

const dayParts = ["ochtend", "middag"] as const;

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function addDaysToIsoDate(iso: string, deltaDays: number): string {
  const dt = parseIsoDateLocal(iso);
  dt.setDate(dt.getDate() + deltaDays);
  return formatIsoDateLocal(dt);
}

export function formatWeekStartNl(dateStr: string): string {
  const d = parseIsoDateLocal(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getIsoDateForWeekday(weekStart: string, weekday: number): string {
  return addDaysToIsoDate(weekStart, weekday - 1);
}

function isOpenFromPeriods(
  loc: WireframeLocation | undefined,
  weekday: number,
  dayPart: string,
  weekStart: string,
): boolean {
  if (!loc) return false;
  const dayMap: Record<number, string> = { 1: "ma", 2: "di", 3: "wo", 4: "do", 5: "vr" };
  const dayKey = dayMap[weekday];
  const targetDate = addDaysToIsoDate(weekStart, weekday - 1);
  return loc.periods.some((period) => {
    const inRange = targetDate >= period.start && targetDate <= period.end;
    const slots = period.slots as Record<string, { ochtend?: number; middag?: number }>;
    const hours = Number(slots?.[dayKey]?.[dayPart as "ochtend" | "middag"] || 0);
    return inRange && hours > 0;
  });
}

function getAssignmentsForCell(
  assignments: WireframeAssignment[],
  locationId: string,
  weekday: number,
  dayPart: string,
) {
  return assignments.filter((a) => a.locationId === locationId && a.weekday === weekday && a.dayPart === dayPart);
}

function getLocationName(locations: WireframeLocation[], id: string): string {
  return locations.find((l) => l.id === id)?.name ?? "-";
}

function getEmployeeName(employees: WireframeEmployee[], id: string): string {
  return employees.find((e) => e.id === id)?.name ?? "-";
}

function isEmployeeAvailableForWeekday(
  s: PublicPlanningSnapshot,
  employee: WireframeEmployee,
  weekday: number,
): boolean {
  if (!employee.days.includes(weekday)) return false;
  const dayIso = getIsoDateForWeekday(s.weekStart, weekday);
  const isAbsent = (employee.absences || []).some((a) => a.date === dayIso);
  if (isAbsent) return false;
  return s.locations.some((loc) =>
    dayParts.some((dayPart) => isOpenFromPeriods(loc, weekday, dayPart, s.weekStart)),
  );
}

function isEmployeePlanableForWeekday(employee: WireframeEmployee, weekday: number, weekStart: string): boolean {
  if (!employee.days.includes(weekday)) return false;
  const dayIso = getIsoDateForWeekday(weekStart, weekday);
  return !(employee.absences || []).some((a) => a.date === dayIso);
}

function getWeekdayHeaderLabel(weekday: number, weekStart: string): string {
  const names: Record<number, string> = {
    1: "MAANDAG",
    2: "DINSDAG",
    3: "WOENSDAG",
    4: "DONDERDAG",
    5: "VRIJDAG",
  };
  const d = parseIsoDateLocal(addDaysToIsoDate(weekStart, weekday - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `<span class="weekday-header-day">${names[weekday]}</span><span class="weekday-header-date">${dd}/${mm}/${yyyy}</span>`;
}

function escapeHtmlForExport(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function compareNameNl(a: string, b: string): number {
  return a.localeCompare(b, "nl", { sensitivity: "base" });
}

function sortedLocationsByName(locations: WireframeLocation[]): WireframeLocation[] {
  return [...locations].sort((x, y) => compareNameNl(x.name, y.name));
}

function sortedEmployeesByName(employees: WireframeEmployee[]): WireframeEmployee[] {
  return [...employees].sort((x, y) => compareNameNl(x.name, y.name));
}

export function buildPublicLocationTableHtml(s: PublicPlanningSnapshot): string {
  const { locations, employees, assignments, weekStart } = s;
  let locationHtml = "<thead><tr><th>Locatie / Dagdeel</th>";
  for (let weekday = 1; weekday <= 5; weekday++) {
    locationHtml += `<th>${getWeekdayHeaderLabel(weekday, weekStart)}</th>`;
  }
  locationHtml += "</tr></thead><tbody>";

  sortedLocationsByName(locations).forEach((loc) => {
    dayParts.forEach((dayPart) => {
      const hasAnyOpenDayPart = [1, 2, 3, 4, 5].some((weekday) =>
        isOpenFromPeriods(loc, weekday, dayPart, weekStart),
      );
      if (!hasAnyOpenDayPart) return;
      const locationLabel = `${loc.name} - ${dayPart}`;
      locationHtml += `<tr data-location="${loc.id}"><td>${locationLabel}</td>`;
      for (let weekday = 1; weekday <= 5; weekday++) {
        if (!isOpenFromPeriods(loc, weekday, dayPart, weekStart)) {
          locationHtml += '<td class="planning-cell closed">Gesloten</td>';
          continue;
        }
        const ass = getAssignmentsForCell(assignments, loc.id, weekday, dayPart);
        const names = ass
          .map((a) => {
            const employeeName = getEmployeeName(employees, a.employeeId);
            return `<div class="cell-employee-chip employee-plan-chip person-status-blue" title="${escapeAttr(employeeName)}">
                 <span class="cell-employee-name">${escapeHtmlForExport(employeeName)}</span>
               </div>`;
          })
          .join("");
        locationHtml += `<td class="planning-cell">${names}</td>`;
      }
      locationHtml += "</tr>";
    });
  });
  locationHtml += "</tbody>";
  return locationHtml;
}

export function buildPublicEmployeeTableHtml(s: PublicPlanningSnapshot): string {
  const { employees, assignments, locations, weekStart } = s;
  let employeeHtml = "<thead><tr><th>Medewerker</th>";
  for (let weekday = 1; weekday <= 5; weekday++) {
    employeeHtml += `<th>${getWeekdayHeaderLabel(weekday, weekStart)}</th>`;
  }
  employeeHtml += "<th>Totaal</th></tr></thead><tbody>";
  sortedEmployeesByName(employees).forEach((emp) => {
    employeeHtml += `<tr><td>${escapeHtmlForExport(emp.name)}</td>`;
    for (let weekday = 1; weekday <= 5; weekday++) {
      const dayAssignments = assignments.filter((a) => a.employeeId === emp.id && a.weekday === weekday);
      const day = dayAssignments
        .map(
          (a) =>
            `<div class="cell-employee-chip employee-plan-chip"><span class="cell-employee-name">${escapeHtmlForExport(
              `${getLocationName(locations, a.locationId)} (${a.dayPart})`,
            )}</span></div>`,
        )
        .join("");
      const isPlanableDay = isEmployeePlanableForWeekday(emp, weekday, weekStart);
      const isEmptyButAvailable = !day && isEmployeeAvailableForWeekday(s, emp, weekday);
      const dayClass = !isPlanableDay ? "closed-cell" : isEmptyButAvailable ? "ok" : "";
      const cellInner = day || (isEmptyButAvailable ? "Beschikbaar" : "Afwezig");
      employeeHtml += `<td class="${dayClass}">${cellInner}</td>`;
    }
    const total = assignments.filter((a) => a.employeeId === emp.id).length * 4.5;
    employeeHtml += `<td>${total}u / ${emp.weekHours}u</td></tr>`;
  });
  employeeHtml += "</tbody>";
  return employeeHtml;
}

function getWeekdayExportHeader(weekday: number, weekStart: string): string {
  const names: Record<number, string> = {
    1: "Maandag",
    2: "Dinsdag",
    3: "Woensdag",
    4: "Donderdag",
    5: "Vrijdag",
  };
  const d = parseIsoDateLocal(addDaysToIsoDate(weekStart, weekday - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${names[weekday]} ${dd}-${mm}-${yyyy}`;
}

export function buildPublicLocationMatrix(s: PublicPlanningSnapshot): { headers: string[]; rows: string[][] } {
  const headers = ["Locatie / dagdeel"];
  for (let w = 1; w <= 5; w++) headers.push(getWeekdayExportHeader(w, s.weekStart));
  const rows: string[][] = [];
  sortedLocationsByName(s.locations).forEach((loc) => {
    dayParts.forEach((dayPart) => {
      const hasAny = [1, 2, 3, 4, 5].some((weekday) => isOpenFromPeriods(loc, weekday, dayPart, s.weekStart));
      if (!hasAny) return;
      const row: string[] = [`${loc.name} - ${dayPart}`];
      for (let weekday = 1; weekday <= 5; weekday++) {
        if (!isOpenFromPeriods(loc, weekday, dayPart, s.weekStart)) {
          row.push("Gesloten");
          continue;
        }
        const ass = getAssignmentsForCell(s.assignments, loc.id, weekday, dayPart);
        row.push(ass.map((a) => getEmployeeName(s.employees, a.employeeId)).join(", ") || "-");
      }
      rows.push(row);
    });
  });
  return { headers, rows };
}

export function buildPublicEmployeeMatrix(s: PublicPlanningSnapshot): { headers: string[]; rows: string[][] } {
  const headers = ["Medewerker"];
  for (let w = 1; w <= 5; w++) headers.push(getWeekdayExportHeader(w, s.weekStart));
  headers.push("Totaal uren");
  const rows: string[][] = [];
  sortedEmployeesByName(s.employees).forEach((emp) => {
    const row: string[] = [emp.name];
    for (let weekday = 1; weekday <= 5; weekday++) {
      const dayAssignments = s.assignments.filter((a) => a.employeeId === emp.id && a.weekday === weekday);
      if (!isEmployeePlanableForWeekday(emp, weekday, s.weekStart)) {
        row.push("Afwezig");
      } else if (dayAssignments.length === 0) {
        row.push(isEmployeeAvailableForWeekday(s, emp, weekday) ? "Beschikbaar" : "Afwezig");
      } else {
        row.push(dayAssignments.map((a) => `${getLocationName(s.locations, a.locationId)} (${a.dayPart})`).join("; "));
      }
    }
    const total = s.assignments.filter((a) => a.employeeId === emp.id).length * 4.5;
    row.push(`${total} / ${emp.weekHours}`);
    rows.push(row);
  });
  return { headers, rows };
}

function csvEscapeCell(val: string): string {
  const str = String(val ?? "");
  if (/[;\r\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function matrixToCsvSemicolon(matrix: { headers: string[]; rows: string[][] }): string {
  const lines = [matrix.headers.map(csvEscapeCell).join(";")];
  matrix.rows.forEach((r) => lines.push(r.map(csvEscapeCell).join(";")));
  return `\uFEFF${lines.join("\r\n")}`;
}

export function matrixToHtmlTable(matrix: { headers: string[]; rows: string[][] }): string {
  let h = "<thead><tr>";
  matrix.headers.forEach((hdr) => {
    h += `<th>${escapeHtmlForExport(hdr)}</th>`;
  });
  h += "</tr></thead><tbody>";
  matrix.rows.forEach((r) => {
    h += "<tr>";
    r.forEach((c) => {
      h += `<td>${escapeHtmlForExport(c)}</td>`;
    });
    h += "</tr>";
  });
  h += "</tbody>";
  return h;
}
