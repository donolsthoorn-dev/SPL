const weekdays = ["Ma", "Di", "Wo", "Do", "Vr"];
const dayParts = ["ochtend", "middag"];
const DEFAULT_MIN_EMPLOYEES = 2;
const DEFAULT_MAX_EMPLOYEES = 4;

// Stamdata uit Postgres via Next API (eerste keer automatisch gevuld met prototype-set)
let locations = [];
let employees = [];

const state = {
  activePanel: "locationsPanel",
  weekStart: "2026-04-13",
  published: false,
  selectedCell: null,
  selectedEmployeeCell: null,
  selectedLocationId: null,
  selectedEmployeeId: null,
  mailEligibleCount: 0,
  mailLocationEligibleCount: 0,
  mailSending: false,
  publishedWeeks: [],
  locationCellFilter: "all",
  locationFilter: "all",
  assignments: [],
  /** Eerste kolom standaard A–Z */
  locationListSort: { key: "name", dir: "asc" },
  employeeListSort: { key: "name", dir: "asc" }
};

/** YYYY-MM-DD als kalenderdatum in lokale tijd (voorkomt UTC-shift van toISOString). */
function parseIsoDateLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDateLocal(d) {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function addDaysToIsoDate(iso, deltaDays) {
  const dt = parseIsoDateLocal(iso);
  dt.setDate(dt.getDate() + deltaDays);
  return formatIsoDateLocal(dt);
}

/** ISO-weeknummer (1–53), EU-conventie. */
function getIsoWeekNumber(dateStr) {
  const date = parseIsoDateLocal(dateStr);
  const target = new Date(date.getTime());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
}

let planningBootDone = false;
let __weekPersistTimer = null;

async function loadBootstrapFromApi() {
  const res = await fetch("/api/planning/bootstrap", { credentials: "include" });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  const data = await res.json();
  locations = (data.locations || []).map(normalizeLocationCapacityShape);
  employees = (data.employees || []).map(normalizeEmployeeEmailShape);
  return Boolean(data.seededMaster);
}

async function loadWeekFromApi(weekStart) {
  const res = await fetch(`/api/planning/week?weekStart=${encodeURIComponent(weekStart)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  state.published = data.published ?? false;
  state.assignments = data.assignments || [];
}

async function switchToWeek(weekStart) {
  state.weekStart = weekStart;
  document.getElementById("weekStart").value = state.weekStart;
  planningBootDone = false;
  try {
    await loadWeekFromApi(state.weekStart);
  } catch (err) {
    console.error(err);
    window.alert("Week kon niet geladen worden.");
  }
  planningBootDone = true;
  renderContextControls();
  renderPlanningTables();
  renderLocationList();
  renderPublicTable();
  await refreshPublicEmailState();
  renderConflictsAndSuggestions();
  renderEmployeeSelect();
  syncPublicWeekSelectOptions();
  if (state.activePanel === "employeeDetailPanel" && state.selectedEmployeeId) {
    void loadEmployeePersonalPlanningLink(state.selectedEmployeeId);
  }
  if (state.activePanel === "locationDetailPanel" && state.selectedLocationId) {
    void loadLocationPlanningLink(state.selectedLocationId);
  }
}

function schedulePersistWeek() {
  if (!planningBootDone) return;
  window.clearTimeout(__weekPersistTimer);
  __weekPersistTimer = window.setTimeout(() => {
    void persistWeekNow();
  }, 450);
}

async function persistWeekNow() {
  try {
    const res = await fetch("/api/planning/week", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: state.weekStart,
        published: state.published,
        assignments: state.assignments
      })
    });
    if (!res.ok) console.error("Week opslaan mislukt", await res.text());
  } catch (e) {
    console.error(e);
  }
}

function notifyParentPlanningShell(phase) {
  try {
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "spl-planning-app", phase },
        window.location.origin
      );
    }
  } catch (_) {
    /* ignore */
  }
}

const panelTabs = document.querySelectorAll(".module-tab");
const panels = document.querySelectorAll(".panel");
const globalSearchEl = document.getElementById("globalSearch");
const quickFilterEl = document.getElementById("quickFilterWrap");
const locationFilterEl = document.getElementById("locationFilterWrap");
const statusSummaryEl = document.getElementById("statusSummary");
const drawerEl = document.querySelector(".drawer");
const contextHeaderEl = document.querySelector(".context-header");
const toolbarEl = document.querySelector(".toolbar");
const planningLegendEl = document.getElementById("planningLegend");
const locationListTableEl = document.getElementById("locationListTable");
const employeeListTableEl = document.getElementById("employeeListTable");
const locationPlanningTableEl = document.getElementById("locationPlanningTable");
const employeePlanningTableEl = document.getElementById("employeePlanningTable");
const publicTableEl = document.getElementById("publicTable");
const employeeAvailableListEl = document.getElementById("employeeAvailableList");
const employeeUnavailableListEl = document.getElementById("employeeUnavailableList");
const availableSectionEl = document.getElementById("availableSection");
const plannedEmployeeListEl = document.getElementById("plannedEmployeeList");
const conflictSectionEl = document.getElementById("conflictSection");
const selectedCellMetaEl = document.getElementById("selectedCellMeta");
const conflictListEl = document.getElementById("conflictList");
const suggestionListEl = document.getElementById("suggestionList");
const plannedListTitleEl = document.getElementById("plannedListTitle");
const suggestionListTitleEl = document.getElementById("suggestionListTitle");
const availableListTitleEl = document.getElementById("availableListTitle");
const unavailableListTitleEl = document.getElementById("unavailableListTitle");
const contextMetaEl = document.getElementById("contextMeta");
const locationSearchInputEl = document.getElementById("locationSearchInput");
const employeeSearchInputEl = document.getElementById("employeeSearchInput");
const assistantSearchInputEl = document.getElementById("assistantSearchInput");
const locationPeriodsContainerEl = document.getElementById("locationPeriodsContainer");
const employeeAbsenceTableBodyEl = document.querySelector("#employeeAbsenceTable tbody");
const appShellEl = document.querySelector(".app-shell");
const publicWeekSelectEl = document.getElementById("publicWeekSelect");

(function initSidebarSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("user");
    const emailEl = document.getElementById("sidebarUserEmail");
    if (emailEl) emailEl.textContent = email && email.trim() ? email.trim() : "";
  } catch (_) {
    /* ignore */
  }
})();

document.getElementById("sidebarLogoutBtn")?.addEventListener("click", () => {
  const target = window.top || window;
  target.location.href = "/auth/sign-out";
});

function syncPlannerAssistantVisibility() {
  const showDrawer =
    (state.activePanel === "locationPlanningPanel" && Boolean(state.selectedCell)) ||
    (state.activePanel === "employeePlanningPanel" && Boolean(state.selectedEmployeeCell));
  drawerEl.classList.toggle("hidden", !showDrawer);
  appShellEl.classList.toggle("assistant-collapsed", !showDrawer);
}

function seedAssignments() {
  state.assignments = [];
  const assignedHours = new Map(employees.map((e) => [e.id, 0]));
  const openCells = [];
  const usedByTimeslot = new Map();
  const stable3Ids = new Set(locations.slice(0, 8).map((l) => l.id));

  const cellKey = (weekday, dayPart) => `${weekday}-${dayPart}`;

  locations.forEach((loc) => {
    [1, 2, 3, 4, 5].forEach((weekday) => {
      dayParts.forEach((dayPart) => {
        if (isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)) {
          openCells.push({ locationId: loc.id, weekday, dayPart });
        }
      });
    });
  });

  // Vaste gezichten: elk team heeft max 5 medewerkers.
  const locationTeams = new Map();
  let teamCursor = 0;
  locations.forEach((loc) => {
    const team = [];
    while (team.length < 5) {
      const candidate = employees[teamCursor % employees.length];
      teamCursor += 1;
      if (!team.some((e) => e.id === candidate.id)) team.push(candidate);
    }
    locationTeams.set(loc.id, team);
  });

  const tryAssign = (locationId, weekday, dayPart, pool) => {
    const key = cellKey(weekday, dayPart);
    if (!usedByTimeslot.has(key)) usedByTimeslot.set(key, new Set());
    const usedInTimeslot = usedByTimeslot.get(key);
    const alreadyInCell = new Set(
      state.assignments
        .filter((a) => a.locationId === locationId && a.weekday === weekday && a.dayPart === dayPart)
        .map((a) => a.employeeId)
    );
    for (const employee of pool) {
      const currentHours = assignedHours.get(employee.id) || 0;
      const slotHours = getScheduledHoursForAssignment(locationId, weekday, dayPart, state.weekStart);
      if (!employee.days.includes(weekday)) continue;
      const dayIso = getIsoDateForWeekday(weekday);
      const isAbsent = (employee.absences || []).some((a) => isAbsenceOnDay(a, dayIso));
      if (isAbsent) continue;
      if (currentHours + slotHours > employee.weekHours + slotHours) continue;
      if (usedInTimeslot.has(employee.id)) continue;
      if (alreadyInCell.has(employee.id)) continue;
      state.assignments.push({ locationId, weekday, dayPart, employeeId: employee.id });
      assignedHours.set(employee.id, currentHours + slotHours);
      usedInTimeslot.add(employee.id);
      return true;
    }
    return false;
  };

  openCells.forEach(({ locationId, weekday, dayPart }) => {
    const target = stable3Ids.has(locationId) ? 3 : 2;
    const teamPool = locationTeams.get(locationId) || [];
    let assignedCount = 0;
    while (assignedCount < target) {
      const fromTeam = tryAssign(locationId, weekday, dayPart, teamPool);
      const fromGlobal = fromTeam ? true : tryAssign(locationId, weekday, dayPart, employees);
      if (!fromTeam && !fromGlobal) break;
      assignedCount += 1;
    }
  });

  // Beperkte, bewuste afwijkingen voor demo/validatie.
  const addExtraToCell = (locationId, weekday, dayPart, count) => {
    for (let i = 0; i < count; i += 1) {
      if (!tryAssign(locationId, weekday, dayPart, employees)) break;
    }
  };
  if (locations[1]) addExtraToCell(locations[1].id, 2, "ochtend", 3); // overbezetting (richting 5)

  // Enkele gerichte dubbelboeking (1 case) voor conflictweergave.
  if (locations[2] && locations[3] && employees[0]) {
    state.assignments.push({
      locationId: locations[2].id,
      weekday: 1,
      dayPart: "ochtend",
      employeeId: employees[0].id
    });
    state.assignments.push({
      locationId: locations[3].id,
      weekday: 1,
      dayPart: "ochtend",
      employeeId: employees[0].id
    });
  }
}

function getLocationName(id) {
  return locations.find((l) => l.id === id)?.name || "-";
}

function normalizeLocationCapacityShape(location) {
  if (!location || typeof location !== "object") return location;
  const minParsed = Number(location.minEmployees);
  const minEmployees = Number.isFinite(minParsed) ? Math.max(1, Math.trunc(minParsed)) : DEFAULT_MIN_EMPLOYEES;
  const maxParsed = Number(location.maxEmployees);
  const maxFromInput = Number.isFinite(maxParsed) ? Math.max(1, Math.trunc(maxParsed)) : DEFAULT_MAX_EMPLOYEES;
  const maxEmployees = Math.max(maxFromInput, minEmployees);
  return {
    ...location,
    minEmployees,
    maxEmployees
  };
}

function normalizeEmployeeEmailShape(employee) {
  if (!employee || typeof employee !== "object") return employee;
  const privateEmail = String(employee.privateEmail || "").trim();
  const businessEmail = String(employee.email || "").trim();
  return {
    ...employee,
    privateEmail,
    planningEmailIsPrivate: employee.planningEmailIsPrivate !== false,
    email: businessEmail
  };
}

function getLocationCapacity(locationId) {
  const location = locations.find((l) => l.id === locationId);
  if (!location) {
    return {
      minEmployees: DEFAULT_MIN_EMPLOYEES,
      maxEmployees: DEFAULT_MAX_EMPLOYEES
    };
  }
  const normalized = normalizeLocationCapacityShape(location);
  if (normalized !== location) Object.assign(location, normalized);
  return {
    minEmployees: location.minEmployees,
    maxEmployees: location.maxEmployees
  };
}

function getEmployeeName(id) {
  return employees.find((e) => e.id === id)?.name || "-";
}

function getAssignmentsForCell(locationId, weekday, dayPart) {
  return state.assignments.filter((a) => a.locationId === locationId && a.weekday === weekday && a.dayPart === dayPart);
}

function normalizeAbsenceRange(absence) {
  const startDate = String(absence?.startDate || absence?.date || "").trim();
  const endDateRaw = String(absence?.endDate || "").trim();
  const endDate = endDateRaw || startDate;
  if (!startDate || !endDate) return null;
  return startDate <= endDate
    ? { startDate, endDate, reason: String(absence?.reason || "Ziek") }
    : { startDate: endDate, endDate: startDate, reason: String(absence?.reason || "Ziek") };
}

function isAbsenceOnDay(absence, dayIso) {
  const normalized = normalizeAbsenceRange(absence);
  if (!normalized) return false;
  return dayIso >= normalized.startDate && dayIso <= normalized.endDate;
}

function doesAbsenceOverlapRange(absence, rangeStart, rangeEnd) {
  const normalized = normalizeAbsenceRange(absence);
  if (!normalized) return false;
  return normalized.startDate <= rangeEnd && normalized.endDate >= rangeStart;
}

function buildAssignmentIndexes(assignments) {
  const byCell = new Map();
  const byEmployeeWeekday = new Map();
  const hoursByEmployee = new Map();

  assignments.forEach((a) => {
    const cellKey = `${a.locationId}|${a.weekday}|${a.dayPart}`;
    const empDayKey = `${a.employeeId}|${a.weekday}`;
    if (!byCell.has(cellKey)) byCell.set(cellKey, []);
    if (!byEmployeeWeekday.has(empDayKey)) byEmployeeWeekday.set(empDayKey, []);
    byCell.get(cellKey).push(a);
    byEmployeeWeekday.get(empDayKey).push(a);
    const assignmentHours = getScheduledHoursForAssignment(a.locationId, a.weekday, a.dayPart, state.weekStart);
    hoursByEmployee.set(a.employeeId, (hoursByEmployee.get(a.employeeId) || 0) + assignmentHours);
  });

  return {
    getCell(locationId, weekday, dayPart) {
      return byCell.get(`${locationId}|${weekday}|${dayPart}`) || [];
    },
    getEmployeeDay(employeeId, weekday) {
      return byEmployeeWeekday.get(`${employeeId}|${weekday}`) || [];
    },
    getEmployeeHours(employeeId) {
      return Math.round((hoursByEmployee.get(employeeId) || 0) * 100) / 100;
    }
  };
}

function isEmployeeAbsentInCurrentWeek(employee) {
  const weekEnd = addDaysToIsoDate(state.weekStart, 4);
  return (employee.absences || []).some((a) => doesAbsenceOverlapRange(a, state.weekStart, weekEnd));
}

function getUniqueFixedEmployeesForLocationWeekIds(locationId) {
  const uniqueEmployeeIds = new Set(
    state.assignments.filter((a) => a.locationId === locationId).map((a) => a.employeeId)
  );
  const fixedIds = Array.from(uniqueEmployeeIds).filter((employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return false;
    if (employee.contractType !== "Vast") return false;
    if (isEmployeeAbsentInCurrentWeek(employee)) return false;
    return true;
  });
  return new Set(fixedIds);
}

function getUniqueFixedEmployeesForLocationWeek(locationId) {
  return getUniqueFixedEmployeesForLocationWeekIds(locationId).size;
}

function wouldExceedFixedEmployeesRule(locationId, employeeId) {
  const employee = employees.find((e) => e.id === employeeId);
  if (!employee || employee.contractType !== "Vast") return false;
  if (isEmployeeAbsentInCurrentWeek(employee)) return false;
  const fixedIds = getUniqueFixedEmployeesForLocationWeekIds(locationId);
  if (fixedIds.has(employeeId)) return false;
  return fixedIds.size >= 4;
}

function isEmployeeAlreadyPlannedAtTimeslot(employeeId, weekday, dayPart, ignoreLocationId = null) {
  return state.assignments.some(
    (a) =>
      a.employeeId === employeeId &&
      a.weekday === weekday &&
      a.dayPart === dayPart &&
      (ignoreLocationId === null || a.locationId !== ignoreLocationId)
  );
}

function getTimeslotAssignmentCount(employeeId, weekday, dayPart) {
  return state.assignments.filter(
    (a) => a.employeeId === employeeId && a.weekday === weekday && a.dayPart === dayPart
  ).length;
}

function canAssignEmployeeToCell(employeeId, locationId, weekday, dayPart, ignoreLocationId = null) {
  if (!isOpenFromPeriods(locationId, weekday, dayPart, state.weekStart)) return false;
  return !isEmployeeAlreadyPlannedAtTimeslot(employeeId, weekday, dayPart, ignoreLocationId);
}

function getScheduledHoursForAssignment(locationId, weekday, dayPart, weekStart) {
  const location = locations.find((l) => l.id === locationId);
  if (!location) return 0;
  const dayMap = { 1: "ma", 2: "di", 3: "wo", 4: "do", 5: "vr" };
  const dayKey = dayMap[weekday];
  const targetDate = addDaysToIsoDate(weekStart, weekday - 1);
  const period = location.periods.find(
    (p) => targetDate >= p.start && targetDate <= p.end
  );
  if (!period) return 0;
  return Number(period.slots?.[dayKey]?.[dayPart] || 0);
}

function getEmployeePlannedHours(employeeId) {
  const hours = state.assignments
    .filter((a) => a.employeeId === employeeId)
    .reduce(
      (total, assignment) =>
        total +
        getScheduledHoursForAssignment(
          assignment.locationId,
          assignment.weekday,
          assignment.dayPart,
          state.weekStart
        ),
      0
    );
  return Math.round(hours * 100) / 100;
}

function hasEmployeeTimeslotConflict(employeeId) {
  const grouped = new Map();
  state.assignments
    .filter((a) => a.employeeId === employeeId)
    .forEach((a) => {
      const key = `${a.weekday}-${a.dayPart}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
  return Array.from(grouped.values()).some((count) => count > 1);
}

function hasEmployeeWeekdayConflict(employeeId, weekday) {
  const grouped = new Map();
  state.assignments
    .filter((a) => a.employeeId === employeeId && a.weekday === weekday)
    .forEach((a) => {
      const key = a.dayPart;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
  return Array.from(grouped.values()).some((count) => count > 1);
}

function getEmployeePlanningStatusClass(employee) {
  const planned = getEmployeePlannedHours(employee.id);
  if (hasEmployeeTimeslotConflict(employee.id)) return "person-status-red";
  if (planned > employee.weekHours) return "person-status-orange";
  return "person-status-blue";
}

function getAssistantHoursStatusClass(employee) {
  const planned = getEmployeePlannedHours(employee.id);
  if (hasEmployeeTimeslotConflict(employee.id)) return "person-status-red";
  if (planned > employee.weekHours) return "person-status-orange";
  if (planned === employee.weekHours) return "person-status-green";
  return "person-status-blue";
}

function getDateForWeekday(weekday) {
  const d = parseIsoDateLocal(addDaysToIsoDate(state.weekStart, weekday - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getIsoDateForWeekday(weekday) {
  return addDaysToIsoDate(state.weekStart, weekday - 1);
}

function isEmployeeAvailableForWeekday(employee, weekday) {
  if (!employee.days.includes(weekday)) return false;
  const dayIso = getIsoDateForWeekday(weekday);
  const isAbsent = (employee.absences || []).some((a) => isAbsenceOnDay(a, dayIso));
  if (isAbsent) return false;
  return locations.some((loc) => dayParts.some((dayPart) => isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)));
}

function isEmployeePlanableForWeekday(employee, weekday) {
  if (!employee.days.includes(weekday)) return false;
  const dayIso = getIsoDateForWeekday(weekday);
  return !(employee.absences || []).some((a) => isAbsenceOnDay(a, dayIso));
}

function getEmployeeAbsenceForWeekday(employee, weekday) {
  const dayIso = getIsoDateForWeekday(weekday);
  return (employee.absences || []).find((a) => isAbsenceOnDay(a, dayIso)) || null;
}

function isEmployeeSickForWeekday(employee, weekday) {
  const absence = getEmployeeAbsenceForWeekday(employee, weekday);
  if (!absence) return false;
  return /ziek/i.test(String(absence.reason || ""));
}

function isEmployeeOnLeaveForWeekday(employee, weekday) {
  const absence = getEmployeeAbsenceForWeekday(employee, weekday);
  if (!absence) return false;
  return /verlof/i.test(String(absence.reason || ""));
}

function isWeekPlanningFrozen() {
  return (
    state.published &&
    (state.activePanel === "locationPlanningPanel" || state.activePanel === "employeePlanningPanel")
  );
}

function syncPlanningReadOnlyUi() {
  const frozen = state.published;
  ["locationPlanningPanel", "employeePlanningPanel"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("planning-frozen", frozen);
  });
  const banner = document.getElementById("planningReadOnlyBanner");
  if (banner) banner.hidden = !isWeekPlanningFrozen();
  if (isWeekPlanningFrozen()) {
    state.selectedCell = null;
    state.selectedEmployeeCell = null;
    syncPlannerAssistantVisibility();
  }
}

function removeAssignmentFromCell(locationId, weekday, dayPart, employeeId) {
  if (isWeekPlanningFrozen()) return;
  const idx = state.assignments.findIndex(
    (a) =>
      a.locationId === locationId &&
      a.weekday === weekday &&
      a.dayPart === dayPart &&
      a.employeeId === employeeId
  );
  if (idx >= 0) state.assignments.splice(idx, 1);
  schedulePersistWeek();
}

function hasDuplicateTimeslotAssignment(employeeId, weekday, dayPart, locationId) {
  const timeslotCount = getTimeslotAssignmentCount(employeeId, weekday, dayPart);
  if (timeslotCount > 1) return true;
  return state.assignments.some(
    (a) =>
      a.employeeId === employeeId &&
      a.weekday === weekday &&
      a.dayPart === dayPart &&
      a.locationId !== locationId
  );
}

function getConflictDatesForEmployeeAtTimeslot(employeeId, weekday, dayPart) {
  const count = getTimeslotAssignmentCount(employeeId, weekday, dayPart);
  if (count <= 1) return [];
  const d = parseIsoDateLocal(addDaysToIsoDate(state.weekStart, weekday - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return [`${dd}/${mm}`];
}

function getOtherTimeslotLocations(employeeId, weekday, dayPart, currentLocationId) {
  return state.assignments
    .filter(
      (a) =>
        a.employeeId === employeeId &&
        a.weekday === weekday &&
        a.dayPart === dayPart &&
        a.locationId !== currentLocationId
    )
    .map((a) => a.locationId);
}

function isOpenFromPeriods(locationId, weekday, dayPart, weekStart) {
  const location = locations.find((l) => l.id === locationId);
  if (!location) return false;
  const dayMap = { 1: "ma", 2: "di", 3: "wo", 4: "do", 5: "vr" };
  const dayKey = dayMap[weekday];
  const targetDate = addDaysToIsoDate(weekStart, weekday - 1);

  return location.periods.some((period) => {
    const inRange = targetDate >= period.start && targetDate <= period.end;
    const hours = Number(period.slots?.[dayKey]?.[dayPart] || 0);
    return inRange && hours > 0;
  });
}

function isLocationOpenWeekday(locationId, weekday, weekStart) {
  return (
    isOpenFromPeriods(locationId, weekday, "ochtend", weekStart) ||
    isOpenFromPeriods(locationId, weekday, "middag", weekStart)
  );
}

/** HTML voor Ma–Vr in locatie-overzicht o.b.v. gekozen planweek (`state.weekStart`). */
function renderLocationListWeekdayCells(locationId) {
  const ws = state.weekStart;
  const dayTitles = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
  let cells = "";
  for (let weekday = 1; weekday <= 5; weekday++) {
    const open = isLocationOpenWeekday(locationId, weekday, ws);
    if (open) {
      cells += `<td class="loc-list-day loc-list-day--open" title="${dayTitles[weekday - 1]} open" aria-label="${dayTitles[weekday - 1]}: open"><span class="loc-list-check" aria-hidden="true">\u2713</span></td>`;
    } else {
      cells += `<td class="loc-list-day loc-list-day--closed" title="${dayTitles[weekday - 1]}: gesloten" aria-label="${dayTitles[weekday - 1]}: gesloten">-</td>`;
    }
  }
  return cells;
}

function renderContextControls() {
  const isPlanning = state.activePanel === "locationPlanningPanel" || state.activePanel === "employeePlanningPanel" || state.activePanel === "publicPanel";
  if (isPlanning) {
    const weekLabel = `Week ${getIsoWeekNumber(state.weekStart)} (week van ${formatWeekStart(state.weekStart)})`;
    if (state.published) {
      contextMetaEl.innerHTML = `${weekLabel} — <span class="published-status-inline"><span class="published-check" aria-hidden="true">✓</span> Gepubliceerd</span>`;
    } else {
      contextMetaEl.textContent = `${weekLabel} - Concept`;
    }
  } else {
    contextMetaEl.textContent = "Stamdata beheer";
  }
  syncPublishButtonAppearance();
  syncPublicPanelActions();
  syncWeekNavigationButtons();
  syncPlanningReadOnlyUi();
}

function syncPublishButtonAppearance() {
  const btn = document.getElementById("publishBtn");
  const label = document.getElementById("publishedStatusLabel");
  const unpublish = document.getElementById("publicUnpublishBtn");
  if (!btn || !label) return;
  const pub = Boolean(state.published);
  if (pub) {
    btn.setAttribute("hidden", "");
    label.removeAttribute("hidden");
    btn.setAttribute("aria-hidden", "true");
    label.setAttribute("aria-hidden", "false");
    if (unpublish) {
      unpublish.hidden = false;
      unpublish.removeAttribute("hidden");
      unpublish.setAttribute("aria-hidden", "false");
    }
  } else {
    label.setAttribute("hidden", "");
    btn.removeAttribute("hidden");
    label.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-hidden", "false");
    btn.textContent = "Publiceer";
    btn.classList.add("primary-btn");
    btn.removeAttribute("aria-pressed");
    btn.title = "Maak de planning van deze week zichtbaar op Publieke inzage.";
    if (unpublish) {
      unpublish.hidden = true;
      unpublish.setAttribute("hidden", "");
      unpublish.setAttribute("aria-hidden", "true");
    }
  }
}

function syncPublicPanelActions() {
  const excel = document.getElementById("publicExportExcelBtn");
  const pdf = document.getElementById("publicExportPdfBtn");
  const link = document.getElementById("publicCopyLinkBtn");
  const emailBtn = document.getElementById("publicSendEmailBtn");
  const emailLocBtn = document.getElementById("publicSendLocationEmailBtn");
  const dis = !state.published;
  if (excel) excel.disabled = dis;
  if (pdf) pdf.disabled = dis;
  if (link) link.disabled = dis;
  if (emailBtn) {
    const emailDis = dis || state.mailSending || state.mailEligibleCount <= 0;
    emailBtn.disabled = emailDis;
    emailBtn.textContent = state.mailSending
      ? "E-mail verzenden..."
      : `E-mail planning naar ${formatMedewerkerCount(state.mailEligibleCount)}`;
  }
  if (emailLocBtn) {
    const emailLocDis = dis || state.mailSending || state.mailLocationEligibleCount <= 0;
    emailLocBtn.disabled = emailLocDis;
    emailLocBtn.textContent = state.mailSending
      ? "E-mail verzenden..."
      : `E-mail planning naar ${formatLocatieCount(state.mailLocationEligibleCount)}`;
  }
}

function syncPublicWeekSelectOptions() {
  if (!publicWeekSelectEl) return;
  const options = ['<option value="">Gepubliceerde week...</option>'];
  state.publishedWeeks.forEach((weekStart) => {
    const selected = weekStart === state.weekStart ? " selected" : "";
    options.push(
      `<option value="${weekStart}"${selected}>Week ${getIsoWeekNumber(weekStart)} (week van ${formatWeekStart(weekStart)})</option>`
    );
  });
  publicWeekSelectEl.innerHTML = options.join("");
  publicWeekSelectEl.disabled = state.publishedWeeks.length === 0;
  syncWeekNavigationButtons();
}

function syncWeekNavigationButtons() {
  const prevBtn = document.getElementById("prevWeekBtn");
  const nextBtn = document.getElementById("nextWeekBtn");
  if (!prevBtn || !nextBtn) return;

  if (state.activePanel !== "publicPanel") {
    prevBtn.hidden = false;
    nextBtn.hidden = false;
    return;
  }

  const idx = state.publishedWeeks.indexOf(state.weekStart);
  if (idx < 0) {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    return;
  }

  prevBtn.hidden = idx >= state.publishedWeeks.length - 1;
  nextBtn.hidden = idx <= 0;
}

async function refreshPublishedWeeks() {
  try {
    const res = await fetch("/api/planning/published-weeks", { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    state.publishedWeeks = Array.isArray(data.weeks) ? data.weeks : [];
  } catch (e) {
    console.error("Gepubliceerde weken laden mislukt", e);
    state.publishedWeeks = [];
  }
  syncPublicWeekSelectOptions();
}

async function ensurePublicPanelWeek() {
  await refreshPublishedWeeks();
  if (!state.publishedWeeks.length) {
    renderPublicTable();
    return;
  }
  if (!state.publishedWeeks.includes(state.weekStart)) {
    await switchToWeek(state.publishedWeeks[0]);
    return;
  }
  syncPublicWeekSelectOptions();
  renderPublicTable();
}

function formatWeekStart(dateStr) {
  const d = parseIsoDateLocal(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatMedewerkerCount(n) {
  return `${n} ${n === 1 ? "medewerker" : "medewerkers"}`;
}

function formatLocatieCount(n) {
  return `${n} ${n === 1 ? "locatie" : "locaties"}`;
}

function getWeekdayHeaderLabel(weekday) {
  const names = {
    1: "MAANDAG",
    2: "DINSDAG",
    3: "WOENSDAG",
    4: "DONDERDAG",
    5: "VRIJDAG"
  };
  const d = parseIsoDateLocal(addDaysToIsoDate(state.weekStart, weekday - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `<span class="weekday-header-day">${names[weekday]}</span><span class="weekday-header-date">${dd}/${mm}/${yyyy}</span>`;
}

function updateToolbarByPanel() {
  const isLocationOverview = state.activePanel === "locationsPanel";
  const isEmployeeOverview = state.activePanel === "employeesPanel";
  const isLocationDetail = state.activePanel === "locationDetailPanel";
  const isEmployeeDetail = state.activePanel === "employeeDetailPanel";
  const isPlanningPanel =
    state.activePanel === "locationPlanningPanel" ||
    state.activePanel === "employeePlanningPanel" ||
    state.activePanel === "publicPanel";

  if (isLocationOverview || isEmployeeOverview || isLocationDetail || isEmployeeDetail) {
    contextHeaderEl.style.display = "none";
  } else {
    contextHeaderEl.style.display = "flex";
  }

  if (isLocationOverview || isLocationDetail) {
    globalSearchEl.placeholder = "Zoek locatie";
    quickFilterEl.style.display = "none";
    statusSummaryEl.style.display = "none";
    drawerEl.classList.add("hidden");
    toolbarEl.style.display = "none";
    planningLegendEl.style.display = "none";
  } else if (isEmployeeOverview || isEmployeeDetail) {
    globalSearchEl.placeholder = "Zoek medewerker";
    quickFilterEl.style.display = "none";
    statusSummaryEl.style.display = "none";
    drawerEl.classList.add("hidden");
    toolbarEl.style.display = "none";
    planningLegendEl.style.display = "none";
  } else if (isPlanningPanel) {
    globalSearchEl.placeholder =
      state.activePanel === "employeePlanningPanel" ? "Zoek medewerker" : "Zoek medewerker, locatie of conflict...";
    const hideGlobalSearch =
      state.activePanel === "locationPlanningPanel" ||
      state.activePanel === "publicPanel";
    globalSearchEl.style.display = hideGlobalSearch ? "none" : "block";
    quickFilterEl.style.display = state.activePanel === "publicPanel" ? "none" : "inline-block";
    statusSummaryEl.style.display = state.activePanel === "publicPanel" ? "none" : "inline-block";
    toolbarEl.style.display = "flex";
    planningLegendEl.style.display = state.activePanel === "locationPlanningPanel" ? "grid" : "none";
    if (assistantSearchInputEl) {
      assistantSearchInputEl.placeholder =
        state.activePanel === "employeePlanningPanel" ? "Zoek locatie..." : "Zoek medewerker...";
    }
    if (state.activePanel === "employeePlanningPanel") {
      plannedListTitleEl.textContent = "Geplande locaties";
      suggestionListTitleEl.textContent = "Suggesties";
      availableListTitleEl.textContent = "Overige beschikbare locaties";
      unavailableListTitleEl.textContent = "Niet beschikbare locaties";
    } else {
      plannedListTitleEl.textContent = "Geplande medewerkers";
      suggestionListTitleEl.textContent = "Suggesties";
      availableListTitleEl.textContent = "Overige beschikbare medewerkers";
      unavailableListTitleEl.textContent = "Niet beschikbare medewerkers";
    }
    const copyWeekBtn = document.getElementById("copyWeekBtn");
    if (copyWeekBtn) copyWeekBtn.hidden = state.activePanel === "publicPanel";
  }
  syncPlannerAssistantVisibility();
}

function compareLocale(a, b, dir) {
  const cmp = String(a).localeCompare(String(b), "nl", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

function sortEmployeesByNameAsc(list) {
  return [...list].sort((a, b) => compareLocale(a.name, b.name, "asc"));
}

function sortLocationsByNameAsc(list) {
  return [...list].sort((a, b) => compareLocale(a.name, b.name, "asc"));
}

function compareNumeric(a, b, dir) {
  const na = Number(a);
  const nb = Number(b);
  const cmp = na === nb ? 0 : na < nb ? -1 : 1;
  return dir === "asc" ? cmp : -cmp;
}

/** Lege / ontbrekende e-mail sorteert als lege string. */
function compareEmailField(a, b, dir) {
  const sa = a != null && String(a).trim() ? String(a).trim() : "";
  const sb = b != null && String(b).trim() ? String(b).trim() : "";
  return compareLocale(sa, sb, dir);
}

function getEmployeeActivePlanningEmail(employee) {
  if (!employee || typeof employee !== "object") return "";
  const prefersPrivate = employee.planningEmailIsPrivate !== false;
  const preferredRaw = prefersPrivate ? employee.privateEmail : employee.email;
  const fallbackRaw = prefersPrivate ? employee.email : employee.privateEmail;
  const preferred = preferredRaw != null ? String(preferredRaw).trim() : "";
  if (preferred) return preferred;
  return fallbackRaw != null ? String(fallbackRaw).trim() : "";
}

function sortThClass(activeKey, colKey, dir) {
  if (activeKey !== colKey) return "sortable-th";
  return `sortable-th sorted sorted-${dir}`;
}

function renderContractTypeLabel(contractType) {
  if (contractType === "Vast") {
    return '<span class="contract-type-label contract-type-label--vast"><i class="fa-solid fa-user" aria-hidden="true"></i><span>Vast contract</span></span>';
  }
  if (contractType === "OproepKracht" || contractType === "Inval") {
    return '<span class="contract-type-label contract-type-label--oproep-kracht"><i class="fa-regular fa-user" aria-hidden="true"></i><span>Oproep kracht</span></span>';
  }
  return contractType || "-";
}

function renderContractTypeIcon(contractType) {
  if (contractType === "Vast") {
    return '<i class="fa-solid fa-user cell-employee-contract-icon" aria-hidden="true"></i>';
  }
  if (contractType === "OproepKracht" || contractType === "Inval") {
    return '<i class="fa-regular fa-user cell-employee-contract-icon" aria-hidden="true"></i>';
  }
  return "";
}

function renderAssistantContractIcon(employee) {
  if (!employee) return "";
  if (employee.contractType === "Vast") {
    return '<i class="fa-solid fa-user assistant-contract-icon" aria-hidden="true"></i>';
  }
  if (employee.contractType === "OproepKracht" || employee.contractType === "Inval") {
    return '<i class="fa-regular fa-user assistant-contract-icon" aria-hidden="true"></i>';
  }
  return "";
}

function renderAbsenceReasonLabel(reason) {
  if (/ziek/i.test(String(reason || ""))) {
    return '<span class="absence-reason-label absence-reason-label--sick"><i class="fa-solid fa-bed" aria-hidden="true"></i><span>Ziek</span></span>';
  }
  if (/verlof/i.test(String(reason || ""))) {
    return '<span class="absence-reason-label absence-reason-label--leave"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i><span>Verlof</span></span>';
  }
  return reason || "-";
}

function renderLocationList() {
  const { key, dir } = state.locationListSort;
  const ws = state.weekStart;
  const dayKeyToWeekday = { ma: 1, di: 2, wo: 3, do: 4, vr: 5 };
  const sorted = [...locations].sort((a, b) => {
    if (key === "place") return compareLocale(a.place, b.place, dir);
    if (key === "email") return compareEmailField(a.email, b.email, dir);
    const wd = dayKeyToWeekday[key];
    if (wd) {
      const va = isLocationOpenWeekday(a.id, wd, ws) ? 1 : 0;
      const vb = isLocationOpenWeekday(b.id, wd, ws) ? 1 : 0;
      return compareNumeric(va, vb, dir);
    }
    return compareLocale(a.name, b.name, dir);
  });
  let html = `<thead><tr>
    <th class="${sortThClass(key, "name", dir)}" data-sort-loc="name" scope="col">Naam locatie<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "email", dir)} loc-list-email-col" data-sort-loc="email" scope="col">E-mail<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "ma", dir)} loc-list-day-th" data-sort-loc="ma" scope="col" title="Maandag (gekozen week)">Ma<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "di", dir)} loc-list-day-th" data-sort-loc="di" scope="col" title="Dinsdag (gekozen week)">Di<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "wo", dir)} loc-list-day-th" data-sort-loc="wo" scope="col" title="Woensdag (gekozen week)">Wo<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "do", dir)} loc-list-day-th" data-sort-loc="do" scope="col" title="Donderdag (gekozen week)">Do<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "vr", dir)} loc-list-day-th" data-sort-loc="vr" scope="col" title="Vrijdag (gekozen week)">Vr<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "place", dir)}" data-sort-loc="place" scope="col">Plaats<span class="sort-indicator" aria-hidden="true"></span></th>
  </tr></thead><tbody>`;
  sorted.forEach((loc) => {
    const emailRaw = loc.email && String(loc.email).trim();
    const emailCell = emailRaw ? escapeHtmlForExport(emailRaw) : "-";
    const dayCells = renderLocationListWeekdayCells(loc.id);
    html += `<tr class="clickable-row" data-location-detail="${loc.id}"><td>${loc.name}</td><td>${emailCell}</td>${dayCells}<td>${loc.place}</td></tr>`;
  });
  html += "</tbody>";
  locationListTableEl.innerHTML = html;
  locationListTableEl.querySelectorAll("[data-sort-loc]").forEach((th) => {
    th.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const col = th.dataset.sortLoc;
      if (state.locationListSort.key === col) {
        state.locationListSort.dir = state.locationListSort.dir === "asc" ? "desc" : "asc";
      } else {
        state.locationListSort.key = col;
        state.locationListSort.dir = "asc";
      }
      renderLocationList();
      refreshSearch();
    });
  });
  locationListTableEl.querySelectorAll("[data-location-detail]").forEach((link) => {
    link.addEventListener("click", () => {
      const locationId = link.dataset.locationDetail;
      openLocationDetail(locationId);
    });
  });
}

function renderEmployeeList() {
  const { key, dir } = state.employeeListSort;
  const sorted = [...employees].sort((a, b) => {
    if (key === "email") return compareEmailField(getEmployeeActivePlanningEmail(a), getEmployeeActivePlanningEmail(b), dir);
    if (key === "contractType") return compareLocale(a.contractType, b.contractType, dir);
    if (key === "weekHours") return compareNumeric(a.weekHours, b.weekHours, dir);
    return compareLocale(a.name, b.name, dir);
  });
  let html = `<thead><tr>
    <th class="${sortThClass(key, "name", dir)}" data-sort-emp="name" scope="col">Naam medewerker<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "email", dir)}" data-sort-emp="email" scope="col">Actief e-mailadres<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "contractType", dir)}" data-sort-emp="contractType" scope="col">Contracttype<span class="sort-indicator" aria-hidden="true"></span></th>
    <th class="${sortThClass(key, "weekHours", dir)}" data-sort-emp="weekHours" scope="col">Uren per week<span class="sort-indicator" aria-hidden="true"></span></th>
  </tr></thead><tbody>`;
  sorted.forEach((emp) => {
    const emailRaw = getEmployeeActivePlanningEmail(emp);
    const emailCell = emailRaw ? escapeHtmlForExport(emailRaw) : "-";
    html += `<tr class="clickable-row" data-employee-detail="${emp.id}"><td>${emp.name}</td><td>${emailCell}</td><td>${renderContractTypeLabel(emp.contractType)}</td><td>${emp.weekHours}</td></tr>`;
  });
  html += "</tbody>";
  employeeListTableEl.innerHTML = html;
  employeeListTableEl.querySelectorAll("[data-sort-emp]").forEach((th) => {
    th.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const col = th.dataset.sortEmp;
      if (state.employeeListSort.key === col) {
        state.employeeListSort.dir = state.employeeListSort.dir === "asc" ? "desc" : "asc";
      } else {
        state.employeeListSort.key = col;
        state.employeeListSort.dir = "asc";
      }
      renderEmployeeList();
      refreshSearch();
    });
  });
  employeeListTableEl.querySelectorAll("[data-employee-detail]").forEach((link) => {
    link.addEventListener("click", () => {
      const employeeId = link.dataset.employeeDetail;
      openEmployeeDetail(employeeId);
    });
  });
}

function openLocationDetail(locationId) {
  state.selectedLocationId = locationId;
  const location = locations.find((l) => l.id === locationId);
  document.getElementById("locationDetailTitle").textContent = `Locatie detail - ${location.name}`;
  document.getElementById("locationDetailNameInput").value = location.name;
  document.getElementById("locationDetailPlaceInput").value = location.place;
  const emailInput = document.getElementById("locationDetailEmailInput");
  if (emailInput) emailInput.value = location.email || "";
  const capacity = getLocationCapacity(locationId);
  const minInput = document.getElementById("locationDetailMinEmployeesInput");
  const maxInput = document.getElementById("locationDetailMaxEmployeesInput");
  if (minInput) minInput.value = String(capacity.minEmployees);
  if (maxInput) maxInput.value = String(capacity.maxEmployees);
  renderLocationPeriods(location);
  const locLinkInput = document.getElementById("locationPlanningLinkInput");
  if (locLinkInput) locLinkInput.value = "Locatie link laden...";
  activatePanel("locationDetailPanel");
  void loadLocationPlanningLink(location.id);
}

/** Nieuwe periode direct na `fromPeriod`, zelfde aantal kalenderdagen (inclusief begin- en einddag). */
function periodDatesFollowing(fromPeriod) {
  const startMs = parseIsoDateLocal(fromPeriod.start).getTime();
  const endMs = parseIsoDateLocal(fromPeriod.end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return { start: fromPeriod.end, end: fromPeriod.end };
  }
  const inclusiveDays = Math.round((endMs - startMs) / 86400000) + 1;
  const newStart = addDaysToIsoDate(fromPeriod.end, 1);
  const newEnd = addDaysToIsoDate(newStart, inclusiveDays - 1);
  return { start: newStart, end: newEnd };
}

function createDefaultPeriod(copyFromPeriod = null) {
  if (copyFromPeriod) {
    const { start, end } = periodDatesFollowing(copyFromPeriod);
    return {
      start,
      end,
      slots: {
        ma: { ...copyFromPeriod.slots.ma },
        di: { ...copyFromPeriod.slots.di },
        wo: { ...copyFromPeriod.slots.wo },
        do: { ...copyFromPeriod.slots.do },
        vr: { ...copyFromPeriod.slots.vr }
      }
    };
  }
  return {
    start: "2026-04-01",
    end: "2026-12-31",
    slots: {
      ma: { ochtend: 4.5, middag: 4.5 },
      di: { ochtend: 4.5, middag: 4.5 },
      wo: { ochtend: 4.5, middag: 4.5 },
      do: { ochtend: 4.5, middag: 4.5 },
      vr: { ochtend: 4.5, middag: 4.5 }
    }
  };
}

/** Zet huidige invoervelden in location.periods vóór re-render of push/splice (anders gaan niet-opgeslagen wijzigingen verloren). */
function readLocationPeriodsFromDetailForm(location) {
  if (!location?.periods?.length) return;
  location.periods = location.periods.map((period, index) => {
    const startInput = document.querySelector(`[data-period-start="${index}"]`);
    const endInput = document.querySelector(`[data-period-end="${index}"]`);
    const updated = {
      start: startInput?.value || period.start,
      end: endInput?.value || period.end,
      slots: { ma: {}, di: {}, wo: {}, do: {}, vr: {} }
    };
    ["ma", "di", "wo", "do", "vr"].forEach((day) => {
      const ochtend = document.querySelector(`[data-period-slot="${index}"][data-day="${day}"][data-daypart="ochtend"]`);
      const middag = document.querySelector(`[data-period-slot="${index}"][data-day="${day}"][data-daypart="middag"]`);
      updated.slots[day].ochtend = Number(ochtend?.value || 0);
      updated.slots[day].middag = Number(middag?.value || 0);
    });
    return updated;
  });
}

function renderLocationPeriods(location) {
  locationPeriodsContainerEl.innerHTML = "";
  location.periods.forEach((period, index) => {
    const block = document.createElement("div");
    block.className = "period-block";
    block.innerHTML = `
      <div class="period-header">
        <div class="period-dates">
          <label>Van datum<input type="date" data-period-start="${index}" value="${period.start}" /></label>
          <label>Tot datum<input type="date" data-period-end="${index}" value="${period.end}" /></label>
        </div>
        <div class="period-actions">
          ${
            index > 0
              ? `<button type="button" class="danger-soft-btn" data-delete-period="${index}">Periode verwijderen</button>`
              : ""
          }
        </div>
      </div>
      <table class="period-days-grid">
        <thead>
          <tr>
            <th>Dagdeel</th>
            <th>Maandag</th>
            <th>Dinsdag</th>
            <th>Woensdag</th>
            <th>Donderdag</th>
            <th>Vrijdag</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Ochtend</th>
            <td><input type="number" step="0.25" min="0" placeholder="Ochtend" data-period-slot="${index}" data-day="ma" data-daypart="ochtend" value="${period.slots.ma.ochtend}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Ochtend" data-period-slot="${index}" data-day="di" data-daypart="ochtend" value="${period.slots.di.ochtend}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Ochtend" data-period-slot="${index}" data-day="wo" data-daypart="ochtend" value="${period.slots.wo.ochtend}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Ochtend" data-period-slot="${index}" data-day="do" data-daypart="ochtend" value="${period.slots.do.ochtend}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Ochtend" data-period-slot="${index}" data-day="vr" data-daypart="ochtend" value="${period.slots.vr.ochtend}" /></td>
          </tr>
          <tr>
            <th>Middag</th>
            <td><input type="number" step="0.25" min="0" placeholder="Middag" data-period-slot="${index}" data-day="ma" data-daypart="middag" value="${period.slots.ma.middag}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Middag" data-period-slot="${index}" data-day="di" data-daypart="middag" value="${period.slots.di.middag}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Middag" data-period-slot="${index}" data-day="wo" data-daypart="middag" value="${period.slots.wo.middag}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Middag" data-period-slot="${index}" data-day="do" data-daypart="middag" value="${period.slots.do.middag}" /></td>
            <td><input type="number" step="0.25" min="0" placeholder="Middag" data-period-slot="${index}" data-day="vr" data-daypart="middag" value="${period.slots.vr.middag}" /></td>
          </tr>
        </tbody>
      </table>
    `;
    locationPeriodsContainerEl.appendChild(block);
  });

  locationPeriodsContainerEl.querySelectorAll("[data-delete-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const deleteIndex = Number(btn.dataset.deletePeriod);
      const confirmed = window.confirm("Weet je zeker dat je deze periode wilt verwijderen?");
      if (!confirmed) return;
      readLocationPeriodsFromDetailForm(location);
      location.periods.splice(deleteIndex, 1);
      renderLocationPeriods(location);
    });
  });
}

function openEmployeeDetail(employeeId) {
  state.selectedEmployeeId = employeeId;
  const employee = employees.find((e) => e.id === employeeId);
  document.getElementById("employeeDetailTitle").textContent = `Medewerker detail - ${employee.name}`;
  document.getElementById("employeeDetailNameInput").value = employee.name;
  document.getElementById("employeeDetailBusinessEmailInput").value = employee.email || "";
  document.getElementById("employeeDetailPrivateEmailInput").value = employee.privateEmail || "";
  document.getElementById("employeeDetailPlanningEmailIsPrivateInput").checked =
    employee.planningEmailIsPrivate !== false;
  document.getElementById("employeeDetailContractInput").value = employee.contractType;
  document.getElementById("employeeDetailHoursInput").value = employee.weekHours;
  document.getElementById("employeeDetailEndDateInput").value = employee.endDate || "";
  const personalLinkInput = document.getElementById("employeePersonalPlanningLinkInput");
  personalLinkInput.value = "Persoonlijke link laden...";
  [1, 2, 3, 4, 5].forEach((d) => {
    document.getElementById(`employeeDay${d}`).checked = employee.days.includes(d);
  });
  renderPreferredLocationShuttle(employee.preferredLocationIds);
  renderEmployeeAbsenceRows(employee);
  activatePanel("employeeDetailPanel");
  void loadEmployeePersonalPlanningLink(employee.id);
}

async function loadEmployeePersonalPlanningLink(employeeId) {
  const input = document.getElementById("employeePersonalPlanningLinkInput");
  if (!input) return;
  try {
    const res = await fetch(
      `/api/planning/public-link?weekStart=${encodeURIComponent(state.weekStart)}&employeeId=${encodeURIComponent(employeeId)}`,
      { credentials: "include" },
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    input.value = data.link || "";
  } catch (e) {
    input.value = "";
    document.getElementById("employeeDetailValidation").textContent =
      "Persoonlijke link laden mislukt: " + (e.message || e);
  }
}

async function loadLocationPlanningLink(locationId) {
  const input = document.getElementById("locationPlanningLinkInput");
  if (!input) return;
  try {
    const res = await fetch(
      `/api/planning/public-link?weekStart=${encodeURIComponent(state.weekStart)}&locationId=${encodeURIComponent(locationId)}`,
      { credentials: "include" },
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    input.value = data.link || "";
  } catch (e) {
    input.value = "";
    document.getElementById("locationDetailValidation").textContent =
      "Locatie link laden mislukt: " + (e.message || e);
  }
}

function renderPreferredLocationShuttle(selectedIds) {
  const availableEl = document.getElementById("employeeAvailableLocations");
  const selectedEl = document.getElementById("employeeSelectedLocations");
  availableEl.innerHTML = "";
  selectedEl.innerHTML = "";
  const selectedSet = new Set(selectedIds);
  const selectedLocations = selectedIds
    .map((id) => locations.find((location) => location.id === id))
    .filter(Boolean);
  const availableLocations = sortLocationsByNameAsc(locations.filter((location) => !selectedSet.has(location.id)));
  selectedLocations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location.id;
    option.textContent = `${location.name} (${location.place})`;
    selectedEl.appendChild(option);
  });
  availableLocations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location.id;
    option.textContent = `${location.name} (${location.place})`;
    availableEl.appendChild(option);
  });
}

function sortSelectOptionsByText(selectEl) {
  const options = Array.from(selectEl.options);
  options.sort((a, b) => compareLocale(a.textContent || "", b.textContent || "", "asc"));
  selectEl.innerHTML = "";
  options.forEach((option) => selectEl.appendChild(option));
}

function moveSelectedOptions(fromEl, toEl) {
  const selected = Array.from(fromEl.selectedOptions);
  selected.forEach((option) => {
    option.selected = false;
    toEl.appendChild(option);
  });
  if (toEl.id === "employeeAvailableLocations") {
    sortSelectOptionsByText(toEl);
  }
}

function moveOptionByDoubleClick(fromEl, toEl, event) {
  if (event.target.tagName !== "OPTION") return;
  const option = event.target;
  option.selected = false;
  toEl.appendChild(option);
  if (toEl.id === "employeeAvailableLocations") {
    sortSelectOptionsByText(toEl);
  }
}

function getAbsenceRowStartDateValue(tr) {
  if (tr.dataset.rowType === "saved") return String(tr.dataset.startDate || "").trim();
  return String(tr.querySelector(".absence-start-date")?.value || "").trim();
}

function sortEmployeeAbsenceRowsByStartDate() {
  if (!employeeAbsenceTableBodyEl) return;
  const rows = Array.from(employeeAbsenceTableBodyEl.querySelectorAll("tr"));
  rows.sort((a, b) => {
    const aDate = getAbsenceRowStartDateValue(a);
    const bDate = getAbsenceRowStartDateValue(b);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });
  rows.forEach((tr) => employeeAbsenceTableBodyEl.appendChild(tr));
}

function syncAbsenceRemoveButtonsVisibility() {
  if (!employeeAbsenceTableBodyEl) return;
  sortEmployeeAbsenceRowsByStartDate();
  const rows = Array.from(employeeAbsenceTableBodyEl.querySelectorAll("tr"));
  rows.forEach((tr) => {
    const btn = tr.querySelector(".remove-absence-btn");
    if (!btn) return;
    if (tr.dataset.rowType === "saved") {
      btn.hidden = false;
      btn.title = "Deze afwezigheid verwijderen";
      return;
    }
    if (rows.length === 1) {
      const startDateInput = tr.querySelector(".absence-start-date");
      const endDateInput = tr.querySelector(".absence-end-date");
      const hasStartDate = Boolean(startDateInput && String(startDateInput.value || "").trim());
      const hasEndDate = Boolean(endDateInput && String(endDateInput.value || "").trim());
      const hasAnyDate = hasStartDate || hasEndDate;
      btn.hidden = !hasAnyDate;
      btn.title = hasAnyDate ? "Deze regel verwijderen" : "";
    } else {
      btn.hidden = false;
      btn.title = "Deze regel verwijderen";
    }
  });
}

function ensureEmployeeAbsenceHasEditableRow() {
  if (!employeeAbsenceTableBodyEl) return;
  if (employeeAbsenceTableBodyEl.querySelectorAll("tr").length === 0) {
    addEmployeeAbsenceDraftRow("", "", "Ziek");
  }
}

function removeEmployeeAbsenceRow(tr) {
  tr.remove();
  ensureEmployeeAbsenceHasEditableRow();
  syncAbsenceRemoveButtonsVisibility();
}

function editEmployeeAbsenceSavedRow(tr) {
  const normalized = normalizeAbsenceRange({
    startDate: tr.dataset.startDate || "",
    endDate: tr.dataset.endDate || "",
    reason: tr.dataset.reason || "Ziek"
  });
  if (!normalized) return;
  tr.remove();
  addEmployeeAbsenceDraftRow(normalized.startDate, normalized.endDate, normalized.reason);
  syncAbsenceRemoveButtonsVisibility();
}

function renderEmployeeAbsenceRows(employee) {
  if (!employeeAbsenceTableBodyEl) return;
  employeeAbsenceTableBodyEl.innerHTML = "";
  if (!employee.absences || employee.absences.length === 0) {
    addEmployeeAbsenceDraftRow("", "", "Ziek");
    syncAbsenceRemoveButtonsVisibility();
    return;
  }
  employee.absences.forEach((absence) => {
    const normalized = normalizeAbsenceRange(absence);
    if (!normalized) return;
    addEmployeeAbsenceSavedRow(normalized.startDate, normalized.endDate, normalized.reason);
  });
  syncAbsenceRemoveButtonsVisibility();
}

function addEmployeeAbsenceSavedRow(startDateValue, endDateValue, reasonValue) {
  const tr = document.createElement("tr");
  tr.dataset.rowType = "saved";
  tr.dataset.startDate = startDateValue;
  tr.dataset.endDate = endDateValue;
  tr.dataset.reason = reasonValue;
  tr.innerHTML = `
    <td>${startDateValue}</td>
    <td>${endDateValue}</td>
    <td>${renderAbsenceReasonLabel(reasonValue)}</td>
    <td>
      <button type="button" class="ghost-btn edit-absence-btn">Bewerken</button>
      <button type="button" class="danger-soft-btn remove-absence-btn">Verwijderen</button>
    </td>
  `;
  tr.querySelector(".edit-absence-btn").addEventListener("click", () => editEmployeeAbsenceSavedRow(tr));
  tr.querySelector(".remove-absence-btn").addEventListener("click", () => removeEmployeeAbsenceRow(tr));
  employeeAbsenceTableBodyEl.appendChild(tr);
  syncAbsenceRemoveButtonsVisibility();
}

function addEmployeeAbsenceDraftRow(startDateValue = "", endDateValue = "", reasonValue = "Ziek") {
  const tr = document.createElement("tr");
  tr.dataset.rowType = "draft";
  tr.innerHTML = `
    <td><input type="date" class="absence-start-date" value="${startDateValue}" /></td>
    <td><input type="date" class="absence-end-date" value="${endDateValue}" /></td>
    <td>
      <select class="absence-reason">
        <option value="Ziek" ${reasonValue === "Ziek" ? "selected" : ""}>Ziek</option>
        <option value="Bijzonder verlof" ${reasonValue === "Bijzonder verlof" ? "selected" : ""}>Bijzonder verlof</option>
      </select>
    </td>
    <td><button type="button" class="danger-soft-btn remove-absence-btn">Verwijderen</button></td>
  `;
  tr.querySelector(".remove-absence-btn").addEventListener("click", () => removeEmployeeAbsenceRow(tr));
  const startDateInput = tr.querySelector(".absence-start-date");
  const endDateInput = tr.querySelector(".absence-end-date");
  [startDateInput, endDateInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", syncAbsenceRemoveButtonsVisibility);
    input.addEventListener("change", syncAbsenceRemoveButtonsVisibility);
  });
  employeeAbsenceTableBodyEl.appendChild(tr);
  syncAbsenceRemoveButtonsVisibility();
}

function renderPlanningTables() {
  const assignmentIndex = buildAssignmentIndexes(state.assignments);
  const planningLocations = sortLocationsByNameAsc(locations);
  let locationHtml = "<thead><tr><th>Locatie / Dagdeel</th>";
  [1, 2, 3, 4, 5].forEach((weekday) => (locationHtml += `<th>${getWeekdayHeaderLabel(weekday)}</th>`));
  locationHtml += "</tr></thead><tbody>";

  planningLocations.forEach((loc) => {
    dayParts.forEach((dayPart) => {
      const hasAnyOpenDayPart = [1, 2, 3, 4, 5].some((weekday) =>
        isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)
      );
      if (!hasAnyOpenDayPart) return;
      const locationLabel = `${loc.name} - ${dayPart}`;
      locationHtml += `<tr data-location="${loc.id}"><td>${locationLabel}</td>`;
      [1, 2, 3, 4, 5].forEach((weekday) => {
        if (!isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)) {
          locationHtml += `<td class="planning-cell closed" data-closed="true">Gesloten</td>`;
          return;
        }
        const ass = assignmentIndex.getCell(loc.id, weekday, dayPart);
        const capacity = getLocationCapacity(loc.id);
        const hasDoubleBookingConflict = ass.some((a) =>
          hasDuplicateTimeslotAssignment(a.employeeId, weekday, dayPart, loc.id)
        );
        const names = ass
          .map((a) => {
            const employeeName = getEmployeeName(a.employeeId);
            const hasChipConflict = hasDuplicateTimeslotAssignment(a.employeeId, weekday, dayPart, loc.id);
            const employee = employees.find((e) => e.id === a.employeeId);
            const statusClass = employee ? getEmployeePlanningStatusClass(employee) : "person-status-blue";
            const contractIcon = renderContractTypeIcon(employee?.contractType);
            const isSick = employee ? isEmployeeSickForWeekday(employee, weekday) : false;
            const isLeave = employee ? isEmployeeOnLeaveForWeekday(employee, weekday) : false;
            const sickTooltip = `${employeeName} is ziek gemeld op ${getDateForWeekday(weekday)}.`;
            const leaveTooltip = `${employeeName} heeft verlof op ${getDateForWeekday(weekday)}.`;
            const otherLocationIds = getOtherTimeslotLocations(a.employeeId, weekday, dayPart, loc.id);
            const otherLocationNames = otherLocationIds.map((id) => getLocationName(id));
            const conflictTooltip =
              otherLocationNames.length === 1
                ? `${employeeName} staat op deze dag ook gepland op ${otherLocationNames[0]} in de ${dayPart}.`
                : `${employeeName} staat op deze dag ook gepland op ${otherLocationNames.join(" en ")} in de ${dayPart}.`;
            return `<div class="cell-employee-chip ${statusClass} ${hasChipConflict ? "chip-conflict" : ""}" draggable="true" data-employee-id="${a.employeeId}" data-source-location="${loc.id}" data-source-weekday="${weekday}" data-source-daypart="${dayPart}" title="${hasChipConflict ? conflictTooltip : employeeName}">
                 <span class="cell-employee-name">${contractIcon}${employeeName}</span>
                 ${isSick ? `<span class="chip-sick-badge" title="${sickTooltip}"><i class="fa-solid fa-bed" aria-hidden="true"></i><span>Ziek</span></span>` : ""}
                 ${isLeave ? `<span class="chip-leave-badge" title="${leaveTooltip}"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i><span>Verlof</span></span>` : ""}
                 ${hasChipConflict ? `<span class="chip-duplicate-badge" title="${conflictTooltip}"><i class="fa-solid fa-exclamation" aria-hidden="true"></i><span>Dubbel</span></span>` : ""}
                 <button class="chip-remove-btn" data-remove-location="${loc.id}" data-remove-weekday="${weekday}" data-remove-daypart="${dayPart}" data-remove-employee="${a.employeeId}" title="Verwijderen">x</button>
               </div>`;
          })
          .join("");
        const hasCapacityConflict = ass.length < capacity.minEmployees || ass.length > capacity.maxEmployees;
        const cls = hasCapacityConflict ? "danger" : hasDoubleBookingConflict ? "warn" : "ok";
        const isUnderstaffed = ass.length < capacity.minEmployees;
        const isOverstaffed = ass.length > capacity.maxEmployees;
        const isConflict = isUnderstaffed || isOverstaffed || hasDoubleBookingConflict;
        locationHtml += `<td class="planning-cell ${cls}" data-location="${loc.id}" data-weekday="${weekday}" data-daypart="${dayPart}" data-understaffed="${isUnderstaffed}" data-overstaffed="${isOverstaffed}" data-conflict="${isConflict}">${names}</td>`;
      });
      locationHtml += "</tr>";
    });
  });
  locationHtml += "</tbody>";
  locationPlanningTableEl.innerHTML = locationHtml;

  let employeeHtml = "<thead><tr><th>Medewerker</th>";
  [1, 2, 3, 4, 5].forEach((weekday) => (employeeHtml += `<th>${getWeekdayHeaderLabel(weekday)}</th>`));
  employeeHtml += "<th>Totaal</th></tr></thead><tbody>";
  sortEmployeesByNameAsc(employees)
    .forEach((emp) => {
    const employeeContractIcon = renderContractTypeIcon(emp.contractType);
    employeeHtml += `<tr><td><span class="employee-name-with-contract">${employeeContractIcon.replace(
      "cell-employee-contract-icon",
      "cell-employee-contract-icon cell-employee-contract-icon--dark"
    )}${emp.name}</span></td>`;
    [1, 2, 3, 4, 5].forEach((weekday) => {
      const dayAssignments = assignmentIndex.getEmployeeDay(emp.id, weekday);
      const isSickDay = isEmployeeSickForWeekday(emp, weekday);
      const isLeaveDay = isEmployeeOnLeaveForWeekday(emp, weekday);
      const day = dayAssignments
        .map(
          (a) => {
            const onNonWorkingDay = !emp.days.includes(weekday);
            const chipClass = onNonWorkingDay ? "person-status-orange" : "person-status-blue";
            return `<div class="cell-employee-chip employee-plan-chip ${chipClass}">
               <span class="cell-employee-name">${getLocationName(a.locationId)} (${a.dayPart})</span>
               <button class="chip-remove-btn employee-chip-remove-btn" data-remove-location="${a.locationId}" data-remove-weekday="${a.weekday}" data-remove-daypart="${a.dayPart}" data-remove-employee="${a.employeeId}" title="Verwijderen">x</button>
             </div>`;
          }
        )
        .join("");
      const isPlanableDay = isEmployeePlanableForWeekday(emp, weekday);
      const hasDayConflict = hasEmployeeWeekdayConflict(emp.id, weekday);
      const isEmptyButAvailable = !day && isEmployeeAvailableForWeekday(emp, weekday);
      const dayClass = isSickDay
        ? "sick-cell"
        : !isPlanableDay
          ? "closed-cell"
          : hasDayConflict
            ? "danger"
            : isEmptyButAvailable
              ? "ok"
              : "";
      const sickBadge = isSickDay
        ? '<span class="cell-sick-marker" title="Ziek gemeld"><i class="fa-solid fa-bed cell-sick-icon" aria-hidden="true"></i><span>Ziek</span></span>'
        : "";
      const leaveBadge = isLeaveDay
        ? '<span class="cell-leave-marker" title="Bijzonder verlof"><i class="fa-solid fa-calendar-check cell-leave-icon" aria-hidden="true"></i><span>Verlof</span></span>'
        : "";
      const cellContent = day || (isEmptyButAvailable ? "Beschikbaar" : "Afwezig");
      employeeHtml += `<td data-employee-cell="true" data-planable="${isPlanableDay}" data-employee="${emp.id}" data-weekday="${weekday}" class="${dayClass}">${sickBadge}${leaveBadge}${cellContent}</td>`;
    });
    const total = assignmentIndex.getEmployeeHours(emp.id);
    const totalClass = total > emp.weekHours ? "danger" : total === emp.weekHours ? "ok" : "";
    employeeHtml += `<td class="${totalClass}">${total}u / ${emp.weekHours}u</td></tr>`;
  });
  employeeHtml += "</tbody>";
  employeePlanningTableEl.innerHTML = employeeHtml;

  locationPlanningTableEl.querySelectorAll(".planning-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      if (cell.classList.contains("closed")) return;
      state.selectedCell = { locationId: cell.dataset.location, weekday: Number(cell.dataset.weekday), dayPart: cell.dataset.daypart };
      syncPlannerAssistantVisibility();
      selectedCellMetaEl.innerHTML =
        `Geselecteerd: ${getLocationName(state.selectedCell.locationId)}<br>` +
        `Datum: ${getDateForWeekday(state.selectedCell.weekday)}<br>` +
        `Dagdeel: ${state.selectedCell.dayPart === "ochtend" ? "Ochtend" : "Middag"}`;
      renderConflictsAndSuggestions();
      renderEmployeeSelect();
    });

    cell.addEventListener("dragover", (e) => {
      if (cell.classList.contains("closed")) return;
      e.preventDefault();
      cell.classList.add("drop-target");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drop-target"));
    cell.addEventListener("drop", (e) => {
      if (cell.classList.contains("closed")) return;
      e.preventDefault();
      cell.classList.remove("drop-target");
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { employeeId: raw };
      }
      const employeeId = payload.employeeId;
      if (!employeeId) return;
      state.selectedCell = { locationId: cell.dataset.location, weekday: Number(cell.dataset.weekday), dayPart: cell.dataset.daypart };
      syncPlannerAssistantVisibility();
      if (payload.sourceLocation && payload.sourceWeekday && payload.sourceDaypart) {
        removeAssignmentFromCell(payload.sourceLocation, Number(payload.sourceWeekday), payload.sourceDaypart, employeeId);
      }
      assignEmployeeToSelectedCell(employeeId);
      clearDropHighlights();
    });
  });

  locationPlanningTableEl.querySelectorAll(".cell-employee-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (ev) => {
      const payload = {
        employeeId: chip.dataset.employeeId,
        sourceLocation: chip.dataset.sourceLocation,
        sourceWeekday: chip.dataset.sourceWeekday,
        sourceDaypart: chip.dataset.sourceDaypart
      };
      ev.dataTransfer.setData("text/plain", JSON.stringify(payload));
      highlightValidDropCells(chip.dataset.employeeId);
    });
    chip.addEventListener("dragend", clearDropHighlights);
  });

  locationPlanningTableEl.querySelectorAll(".chip-remove-btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeAssignmentFromCell(
        btn.dataset.removeLocation,
        Number(btn.dataset.removeWeekday),
        btn.dataset.removeDaypart,
        btn.dataset.removeEmployee
      );
      renderPlanningTables();
      renderConflictsAndSuggestions();
    });
  });

  employeePlanningTableEl.querySelectorAll("[data-employee-cell='true']").forEach((cell) => {
    cell.addEventListener("click", () => {
      if (cell.dataset.planable !== "true") return;
      state.selectedEmployeeCell = {
        employeeId: cell.dataset.employee,
        weekday: Number(cell.dataset.weekday)
      };
      syncPlannerAssistantVisibility();
      renderConflictsAndSuggestions();
      renderEmployeeSelect();
    });
    cell.addEventListener("dragover", (e) => {
      if (cell.dataset.planable !== "true") return;
      e.preventDefault();
      cell.classList.add("drop-target");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drop-target"));
    cell.addEventListener("drop", (e) => {
      if (cell.dataset.planable !== "true") return;
      e.preventDefault();
      cell.classList.remove("drop-target");
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = {};
      }
      if (!payload.locationId || !payload.dayPart) return;
      state.selectedEmployeeCell = {
        employeeId: cell.dataset.employee,
        weekday: Number(cell.dataset.weekday)
      };
      syncPlannerAssistantVisibility();
      assignLocationToSelectedEmployeeCell(payload.locationId, payload.dayPart);
    });
  });

  employeePlanningTableEl.querySelectorAll(".employee-chip-remove-btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeAssignmentFromCell(
        btn.dataset.removeLocation,
        Number(btn.dataset.removeWeekday),
        btn.dataset.removeDaypart,
        btn.dataset.removeEmployee
      );
      renderPlanningTables();
      renderConflictsAndSuggestions();
      renderEmployeeSelect();
    });
  });

  applyLocationCellFilter();
}

function applyLocationCellFilter() {
  if (state.activePanel !== "locationPlanningPanel") return;
  const rows = locationPlanningTableEl.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const matchesLocation = state.locationFilter === "all" || row.dataset.location === state.locationFilter;
    let visibleCells = 0;
    row.querySelectorAll(".planning-cell").forEach((cell) => {
      let show = true;
      const isClosed = cell.dataset.closed === "true";
      if (state.locationCellFilter === "all") {
        show = true;
      } else if (isClosed) {
        show = false;
      } else if (state.locationCellFilter === "understaffed") {
        show = cell.dataset.understaffed === "true";
      } else if (state.locationCellFilter === "overstaffed") {
        show = cell.dataset.overstaffed === "true";
      } else if (state.locationCellFilter === "conflicts") {
        show = cell.dataset.conflict === "true";
      }
      show = show && matchesLocation;
      cell.classList.toggle("cell-filter-hidden", !show);
      if (show) visibleCells += 1;
    });
    row.style.display = matchesLocation && visibleCells > 0 ? "" : "none";
  });
  updateConflictSummary();
}

function renderLocationFilterOptions() {
  if (!locationFilterEl) return;
  const current = state.locationFilter || "all";
  let html = '<option value="all">Alle locaties</option>';
  locations.forEach((loc) => {
    html += `<option value="${loc.id}">${loc.name}</option>`;
  });
  locationFilterEl.innerHTML = html;
  locationFilterEl.value = locations.some((loc) => loc.id === current) ? current : "all";
}

function updateConflictSummary() {
  const totalConflicts = locationPlanningTableEl.querySelectorAll('.planning-cell[data-conflict="true"]').length;
  statusSummaryEl.textContent = `Conflicten: ${totalConflicts}`;
}

function getSuggestionCandidates(selectedCell, plannedIds) {
  const valid = employees.filter((e) => {
    if (plannedIds.has(e.id)) return false;
    const planned = getEmployeePlannedHours(e.id);
    const isPlanableDay = isEmployeePlanableForWeekday(e, selectedCell.weekday);
    const isTimeslotBlocked = isEmployeeAlreadyPlannedAtTimeslot(
      e.id,
      selectedCell.weekday,
      selectedCell.dayPart,
      selectedCell.locationId
    );
    const exceedsFixedRule = wouldExceedFixedEmployeesRule(selectedCell.locationId, e.id);
    return planned < e.weekHours && isPlanableDay && !isTimeslotBlocked && !exceedsFixedRule;
  });

  const preferred = valid.filter((e) => (e.preferredLocationIds || []).includes(selectedCell.locationId));
  const nonPreferred = valid.filter((e) => !(e.preferredLocationIds || []).includes(selectedCell.locationId));
  return [...preferred, ...nonPreferred];
}

function getLocationOptionCandidates(selectedEmployeeCell) {
  if (!selectedEmployeeCell) return [];
  const { employeeId, weekday } = selectedEmployeeCell;
  const plannedKeys = new Set(
    state.assignments
      .filter((a) => a.employeeId === employeeId && a.weekday === weekday)
      .map((a) => `${a.locationId}-${a.dayPart}`)
  );
  const options = [];
  locations.forEach((loc) => {
    dayParts.forEach((dayPart) => {
      if (!isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)) return;
      const key = `${loc.id}-${dayPart}`;
      if (plannedKeys.has(key)) return;
      const ass = getAssignmentsForCell(loc.id, weekday, dayPart);
      const capacity = getLocationCapacity(loc.id);
      const isTimeslotConflict = isEmployeeAlreadyPlannedAtTimeslot(employeeId, weekday, dayPart, loc.id);
      const isFull = ass.length >= capacity.maxEmployees;
      options.push({
        key,
        locationId: loc.id,
        dayPart,
        isPreferred: !isTimeslotConflict && !isFull,
        isBlocked: isTimeslotConflict || isFull,
        reason: isTimeslotConflict
          ? "Dubbel dagdeel voor medewerker"
          : isFull
            ? `Locatie al vol (${capacity.maxEmployees})`
            : ""
      });
    });
  });
  return options;
}

function getPublicExportMode() {
  const sel = document.getElementById("publicModeSelect");
  return sel?.value === "employee" ? "employee" : "location";
}

function getWeekdayExportHeader(weekday) {
  const names = { 1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag" };
  const d = parseIsoDateLocal(addDaysToIsoDate(state.weekStart, weekday - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${names[weekday]} ${dd}-${mm}-${yyyy}`;
}

function buildPublicLocationExportMatrix() {
  const headers = ["Locatie / dagdeel"];
  for (let w = 1; w <= 5; w++) headers.push(getWeekdayExportHeader(w));
  const rows = [];
  sortLocationsByNameAsc(locations).forEach((loc) => {
    dayParts.forEach((dayPart) => {
      const hasAny = [1, 2, 3, 4, 5].some((weekday) =>
        isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)
      );
      if (!hasAny) return;
      const row = [`${loc.name} - ${dayPart}`];
      for (let weekday = 1; weekday <= 5; weekday++) {
        if (!isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)) {
          row.push("Gesloten");
          continue;
        }
        const ass = getAssignmentsForCell(loc.id, weekday, dayPart);
        row.push(ass.map((a) => getEmployeeName(a.employeeId)).join(", ") || "-");
      }
      rows.push(row);
    });
  });
  return { headers, rows };
}

function buildPublicEmployeeExportMatrix() {
  const headers = ["Medewerker"];
  for (let w = 1; w <= 5; w++) headers.push(getWeekdayExportHeader(w));
  headers.push("Totaal uren");
  const rows = [];
  sortEmployeesByNameAsc(employees).forEach((emp) => {
    const row = [emp.name];
    for (let weekday = 1; weekday <= 5; weekday++) {
      const dayAssignments = state.assignments.filter((a) => a.employeeId === emp.id && a.weekday === weekday);
      if (!isEmployeePlanableForWeekday(emp, weekday)) {
        row.push("Afwezig");
      } else if (dayAssignments.length === 0) {
        row.push(isEmployeeAvailableForWeekday(emp, weekday) ? "Beschikbaar" : "Afwezig");
      } else {
        row.push(dayAssignments.map((a) => `${getLocationName(a.locationId)} (${a.dayPart})`).join("; "));
      }
    }
    const total = getEmployeePlannedHours(emp.id);
    row.push(`${total} / ${emp.weekHours}`);
    rows.push(row);
  });
  return { headers, rows };
}

function csvEscapeCell(val) {
  const s = String(val ?? "");
  if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function matrixToCsvSemicolon(matrix) {
  const { headers, rows } = matrix;
  const lines = [headers.map(csvEscapeCell).join(";")];
  rows.forEach((r) => lines.push(r.map(csvEscapeCell).join(";")));
  return `\uFEFF${lines.join("\r\n")}`;
}

function triggerDownloadCsv(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHtmlForExport(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function matrixToHtmlTable(matrix) {
  const { headers, rows } = matrix;
  let h = "<thead><tr>";
  headers.forEach((hdr) => {
    h += `<th>${escapeHtmlForExport(hdr)}</th>`;
  });
  h += "</tr></thead><tbody>";
  rows.forEach((r) => {
    h += "<tr>";
    r.forEach((c) => {
      h += `<td>${escapeHtmlForExport(c)}</td>`;
    });
    h += "</tr>";
  });
  h += "</tbody>";
  return h;
}

function exportPublicExcel() {
  if (!state.published) return;
  const mode = getPublicExportMode();
  const matrix = mode === "employee" ? buildPublicEmployeeExportMatrix() : buildPublicLocationExportMatrix();
  const csv = matrixToCsvSemicolon(matrix);
  const suffix = mode === "employee" ? "medewerker" : "locatie";
  triggerDownloadCsv(csv, `spl-planning-${state.weekStart}-${suffix}.csv`);
}

function exportPublicPdf() {
  if (!state.published) return;
  const mode = getPublicExportMode();
  const matrix = mode === "employee" ? buildPublicEmployeeExportMatrix() : buildPublicLocationExportMatrix();
  const title = `SPL planning week ${getIsoWeekNumber(state.weekStart)} — ${
    mode === "employee" ? "per medewerker" : "per locatie"
  }`;
  const inner = matrixToHtmlTable(matrix);
  const w = window.open("", "_blank");
  if (!w) {
    window.alert("Pop-up geblokkeerd. Sta pop-ups toe om te kunnen afdrukken / PDF op te slaan.");
    return;
  }
  w.document.write(
    `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><title>${escapeHtmlForExport(title)}</title>` +
      "<style>" +
      "body{font-family:system-ui,sans-serif;padding:16px;}" +
      "h1{font-size:1.1rem;margin:0 0 12px;}" +
      "table{border-collapse:collapse;width:100%;font-size:11px;}" +
      "th,td{border:1px solid #333;padding:6px 8px;text-align:left;vertical-align:top;}" +
      "th{background:#f0f0f0;}" +
      "</style></head><body>" +
      `<h1>${escapeHtmlForExport(title)}</h1><table>${inner}</table>` +
      '<p style="font-size:10px;color:#666;margin-top:12px;">Kies in dit venster Afdrukken (Ctrl+P / Cmd+P) en daarna &ldquo;Opslaan als PDF&rdquo;.</p>' +
      "</body></html>"
  );
  w.document.close();
  w.focus();
  requestAnimationFrame(() => {
    w.print();
  });
}

function copyPublicPlanningLink() {
  if (!state.published) return;
  const url = `${window.location.origin}/publieke-planning?week=${encodeURIComponent(state.weekStart)}`;
  const doneMsg = "Openbare link is gekopieerd naar het klembord.";
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText(url)
      .then(() => window.alert(doneMsg))
      .catch(() => window.prompt("Kopieer deze link handmatig:", url));
  } else {
    window.prompt("Kopieer deze link:", url);
  }
}

/** Zelfde inhoud als de plannings-tabellen, maar alleen-lezen (geen knoppen/drag). Altijd actueel, onafhankelijk van welk tabblad open is. */
function buildPublicLocationViewHtml() {
  let locationHtml = "<thead><tr><th>Locatie / Dagdeel</th>";
  for (let weekday = 1; weekday <= 5; weekday++) {
    locationHtml += `<th>${getWeekdayHeaderLabel(weekday)}</th>`;
  }
  locationHtml += "</tr></thead><tbody>";

  sortLocationsByNameAsc(locations).forEach((loc) => {
    dayParts.forEach((dayPart) => {
      const hasAnyOpenDayPart = [1, 2, 3, 4, 5].some((weekday) =>
        isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)
      );
      if (!hasAnyOpenDayPart) return;
      const locationLabel = `${loc.name} - ${dayPart}`;
      locationHtml += `<tr data-location="${loc.id}"><td>${locationLabel}</td>`;
      for (let weekday = 1; weekday <= 5; weekday++) {
        if (!isOpenFromPeriods(loc.id, weekday, dayPart, state.weekStart)) {
          locationHtml += '<td class="planning-cell closed">Gesloten</td>';
          continue;
        }
        const ass = getAssignmentsForCell(loc.id, weekday, dayPart);
        const names = ass
          .map((a) => {
            const employeeName = getEmployeeName(a.employeeId);
            const employee = employees.find((e) => e.id === a.employeeId);
            const isSick = employee ? isEmployeeSickForWeekday(employee, weekday) : false;
            const isLeave = employee ? isEmployeeOnLeaveForWeekday(employee, weekday) : false;
            const sickTooltip = `${employeeName} is ziek gemeld op ${getDateForWeekday(weekday)}.`;
            const leaveTooltip = `${employeeName} heeft verlof op ${getDateForWeekday(weekday)}.`;
            return `<div class="cell-employee-chip employee-plan-chip" title="${escapeAttr(employeeName)}">
                 <span class="cell-employee-name">${escapeHtmlForExport(employeeName)}</span>
                 ${isSick ? `<span class="chip-sick-badge" title="${escapeAttr(sickTooltip)}"><i class="fa-solid fa-bed" aria-hidden="true"></i><span>Ziek</span></span>` : ""}
                 ${isLeave ? `<span class="chip-leave-badge" title="${escapeAttr(leaveTooltip)}"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i><span>Verlof</span></span>` : ""}
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

function buildPublicEmployeeViewHtml() {
  const assignmentIndex = buildAssignmentIndexes(state.assignments);
  let employeeHtml = "<thead><tr><th>Medewerker</th>";
  for (let weekday = 1; weekday <= 5; weekday++) {
    employeeHtml += `<th>${getWeekdayHeaderLabel(weekday)}</th>`;
  }
  employeeHtml += "<th>Totaal</th></tr></thead><tbody>";
  sortEmployeesByNameAsc(employees)
    .forEach((emp) => {
    employeeHtml += `<tr><td>${escapeHtmlForExport(emp.name)}</td>`;
    for (let weekday = 1; weekday <= 5; weekday++) {
      const dayAssignments = assignmentIndex.getEmployeeDay(emp.id, weekday);
      const day = dayAssignments
        .map(
          (a) => {
            const onNonWorkingDay = !emp.days.includes(weekday);
            const chipClass = onNonWorkingDay ? "person-status-orange" : "person-status-blue";
            return `<div class="cell-employee-chip employee-plan-chip ${chipClass}"><span class="cell-employee-name">${escapeHtmlForExport(
              `${getLocationName(a.locationId)} (${a.dayPart})`
            )}</span></div>`;
          }
        )
        .join("");
      const isPlanableDay = isEmployeePlanableForWeekday(emp, weekday);
      const isEmptyButAvailable = !day && isEmployeeAvailableForWeekday(emp, weekday);
      const dayClass = !isPlanableDay ? "closed-cell" : isEmptyButAvailable ? "ok" : "";
      const cellInner = day || (isEmptyButAvailable ? "Beschikbaar" : "Afwezig");
      employeeHtml += `<td class="${dayClass}">${cellInner}</td>`;
    }
    const total = assignmentIndex.getEmployeeHours(emp.id);
    employeeHtml += `<td>${total}u / ${emp.weekHours}u</td></tr>`;
  });
  employeeHtml += "</tbody>";
  return employeeHtml;
}

function updatePublicReadOnlyNote() {
  const info = document.getElementById("publicReadOnlyInfo");
  if (!info) return;
  if (state.publishedWeeks.length === 0) {
    info.textContent = "Er zijn nog geen gepubliceerde weken beschikbaar voor publieke inzage.";
    return;
  }
  if (!state.published) {
    info.textContent = "Deze week is niet gepubliceerd en wordt daarom niet getoond in publieke inzage.";
  } else {
    info.textContent = "Gepubliceerde planning — zichtbaar voor medewerkers.";
  }
}

function renderPublicTable() {
  if (!publicTableEl) return;
  updatePublicReadOnlyNote();
  if (!state.published || state.publishedWeeks.length === 0) {
    publicTableEl.innerHTML = "";
    return;
  }
  const mode = getPublicExportMode();
  publicTableEl.innerHTML =
    mode === "employee" ? buildPublicEmployeeViewHtml() : buildPublicLocationViewHtml();
}

async function refreshPublicEmailState() {
  try {
    const [resEmp, resLoc] = await Promise.all([
      fetch(`/api/planning/public-notify?weekStart=${encodeURIComponent(state.weekStart)}`, {
        credentials: "include"
      }),
      fetch(`/api/planning/public-notify-locations?weekStart=${encodeURIComponent(state.weekStart)}`, {
        credentials: "include"
      })
    ]);
    if (!resEmp.ok) throw new Error(await resEmp.text());
    if (!resLoc.ok) throw new Error(await resLoc.text());
    const dataEmp = await resEmp.json();
    const dataLoc = await resLoc.json();
    state.mailEligibleCount = Number(dataEmp.eligibleCount || 0);
    state.mailLocationEligibleCount = Number(dataLoc.eligibleCount || 0);
  } catch (e) {
    console.error("Mailstatus laden mislukt", e);
    state.mailEligibleCount = 0;
    state.mailLocationEligibleCount = 0;
  } finally {
    syncPublicPanelActions();
  }
}

function renderConflictsAndSuggestions() {
  conflictListEl.innerHTML = "";
  suggestionListEl.innerHTML = "";
  plannedEmployeeListEl.innerHTML = "";
  if (!state.selectedCell) return;
  const ass = getAssignmentsForCell(state.selectedCell.locationId, state.selectedCell.weekday, state.selectedCell.dayPart);
  const capacity = getLocationCapacity(state.selectedCell.locationId);
  const plannedIds = new Set(ass.map((a) => a.employeeId));

  ass.forEach((a) => {
    const employee = employees.find((e) => e.id === a.employeeId);
    const contractIcon = renderAssistantContractIcon(employee);
    const chip = document.createElement("div");
    chip.className = `drag-chip ${employee ? getAssistantHoursStatusClass(employee) : "person-status-blue"}`;
    chip.innerHTML = `<span class="drag-chip-name">${contractIcon}${getEmployeeName(a.employeeId)}</span><span class="drag-chip-hours">${getEmployeePlannedHours(a.employeeId)}/${employee?.weekHours ?? "-"}</span>`;
    plannedEmployeeListEl.appendChild(chip);
  });
  if (ass.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note";
    msg.textContent = "Nog geen geplande medewerkers in deze cel.";
    plannedEmployeeListEl.appendChild(msg);
  }
  const conflictMessages = [];
  if (ass.length < capacity.minEmployees) {
    conflictMessages.push(`Onderbezetting: minimaal ${capacity.minEmployees} medewerkers vereist.`);
  }
  if (ass.length > capacity.maxEmployees) {
    conflictMessages.push(`Overbezetting: maximaal ${capacity.maxEmployees} medewerkers toegestaan.`);
  }
  ass.forEach((a) => {
    const otherLocationIds = getOtherTimeslotLocations(
      a.employeeId,
      state.selectedCell.weekday,
      state.selectedCell.dayPart,
      state.selectedCell.locationId
    );
    if (otherLocationIds.length > 0) {
      const employeeName = getEmployeeName(a.employeeId);
      const otherLocationNames = otherLocationIds.map((id) => getLocationName(id));
      const readableDayPart = state.selectedCell.dayPart === "ochtend" ? "ochtend" : "middag";
      const msg =
        otherLocationNames.length === 1
          ? `${employeeName} staat op deze dag ook gepland op ${otherLocationNames[0]} in de ${readableDayPart}.`
          : `${employeeName} staat op deze dag ook gepland op ${otherLocationNames.join(" en ")} in de ${readableDayPart}.`;
      conflictMessages.push(msg);
    }
  });
  if (conflictMessages.length > 0) {
    conflictSectionEl.style.display = "block";
    [...new Set(conflictMessages)].forEach((msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      conflictListEl.appendChild(li);
    });
  } else {
    conflictSectionEl.style.display = "none";
  }
  const assistantQuery = assistantSearchInputEl?.value.toLowerCase().trim() || "";
  const suggestionCandidates = getSuggestionCandidates(state.selectedCell, plannedIds);
  const visibleSuggestionCandidates = suggestionCandidates
    .filter((e) => e.name.toLowerCase().includes(assistantQuery))
    .slice(0, 3);

  visibleSuggestionCandidates.forEach((e, idx) => {
    const contractIcon = renderAssistantContractIcon(e);
    const chip = document.createElement("div");
    chip.className = "drag-chip person-status-blue";
    chip.draggable = true;
    chip.dataset.employeeId = e.id;
    chip.innerHTML = `<span class="drag-chip-name">${idx + 1}. ${contractIcon}${e.name}</span><span class="drag-chip-hours">${getEmployeePlannedHours(e.id)}/${e.weekHours}</span>`;
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ employeeId: e.id }));
      highlightValidDropCells(e.id);
    });
    chip.addEventListener("dragend", clearDropHighlights);
    chip.addEventListener("click", () => assignEmployeeToSelectedCell(e.id));
    suggestionListEl.appendChild(chip);
  });
  if (visibleSuggestionCandidates.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note";
    msg.textContent = "Geen suggesties voor deze selectie.";
    suggestionListEl.appendChild(msg);
  }
}

function refreshSearch() {
  const panelId = state.activePanel;
  if (panelId === "locationsPanel") {
    const q = locationSearchInputEl.value.toLowerCase().trim();
    locationListTableEl.querySelectorAll("tbody tr").forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  } else if (panelId === "employeesPanel") {
    const q = employeeSearchInputEl.value.toLowerCase().trim();
    employeeListTableEl.querySelectorAll("tbody tr").forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  } else if (panelId === "locationPlanningPanel") {
    // Zoekveld is hier verborgen; tekst uit "Bezetting per medewerker" niet op deze tabel toepassen.
    locationPlanningTableEl.querySelectorAll("tbody tr").forEach((row) => {
      row.style.display = "";
    });
    applyLocationCellFilter();
  } else if (panelId === "publicPanel") {
    publicTableEl.querySelectorAll("tbody tr").forEach((row) => {
      row.style.display = "";
    });
  } else {
    const q = globalSearchEl.value.toLowerCase().trim();
    document.querySelectorAll(`#${panelId} table tbody tr`).forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  }
}

function renderEmployeeSelect() {
  if (state.activePanel === "employeePlanningPanel") {
    renderLocationSelectForEmployeePlanning();
    return;
  }
  employeeAvailableListEl.innerHTML = "";
  employeeUnavailableListEl.innerHTML = "";
  if (!state.selectedCell) {
    selectedCellMetaEl.textContent = "";
    conflictSectionEl.style.display = "none";
    availableSectionEl.style.display = "none";
    plannedEmployeeListEl.innerHTML = "";
    return;
  }
  const plannedIds = new Set(
    getAssignmentsForCell(state.selectedCell.locationId, state.selectedCell.weekday, state.selectedCell.dayPart).map((a) => a.employeeId)
  );
  const assistantQuery = assistantSearchInputEl?.value.toLowerCase().trim() || "";
  const suggestionCandidates = getSuggestionCandidates(state.selectedCell, plannedIds);
  const suggestionIds = new Set(suggestionCandidates.slice(0, 3).map((e) => e.id));
  const candidates = employees;
  candidates.forEach((e) => {
    if (plannedIds.has(e.id)) return;
    if (assistantQuery && !e.name.toLowerCase().includes(assistantQuery)) return;
    const planned = getEmployeePlannedHours(e.id);
    const unavailableAtTimeslot = isEmployeeAlreadyPlannedAtTimeslot(
      e.id,
      state.selectedCell.weekday,
      state.selectedCell.dayPart,
      state.selectedCell.locationId
    );
    const hasGlobalConflict = hasEmployeeTimeslotConflict(e.id);
    const isOverHours = planned > e.weekHours;
    const isAvailable = !unavailableAtTimeslot && !hasGlobalConflict && !isOverHours && planned < e.weekHours;
    const statusClass = isAvailable ? "person-status-blue" : getAssistantHoursStatusClass(e);
    const chip = document.createElement("div");
    chip.className = `drag-chip ${statusClass} ${unavailableAtTimeslot ? "drag-chip-conflict" : ""}`;
    chip.draggable = true;
    chip.dataset.employeeId = e.id;
    chip.innerHTML = `<span class="drag-chip-name">${renderAssistantContractIcon(e)}${e.name}</span><span class="drag-chip-hours">${planned}/${e.weekHours}</span>`;
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ employeeId: e.id }));
      highlightValidDropCells(e.id);
    });
    chip.addEventListener("click", () => assignEmployeeToSelectedCell(e.id));
    chip.addEventListener("dragend", clearDropHighlights);
    if (!isAvailable) {
      employeeUnavailableListEl.appendChild(chip);
    } else if (suggestionIds.has(e.id)) {
      // Beschikbaar en al zichtbaar in suggesties; niet nogmaals tonen.
      return;
    } else {
      employeeAvailableListEl.appendChild(chip);
    }
  });
  availableSectionEl.style.display = "block";
  if (employeeAvailableListEl.children.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note";
    msg.textContent = "Geen overige beschikbare medewerkers.";
    employeeAvailableListEl.appendChild(msg);
  }
  if (employeeUnavailableListEl.children.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note";
    msg.textContent = "Geen niet-beschikbare medewerkers.";
    employeeUnavailableListEl.appendChild(msg);
  }
}

function assignEmployeeToSelectedCell(employeeId) {
  if (isWeekPlanningFrozen()) return;
  if (!state.selectedCell || !employeeId) return;
  if (!isOpenFromPeriods(state.selectedCell.locationId, state.selectedCell.weekday, state.selectedCell.dayPart, state.weekStart)) return;
  const alreadyInCell = state.assignments.some(
    (a) =>
      a.locationId === state.selectedCell.locationId &&
      a.weekday === state.selectedCell.weekday &&
      a.dayPart === state.selectedCell.dayPart &&
      a.employeeId === employeeId
  );
  if (alreadyInCell) return;
  state.assignments.push({
    locationId: state.selectedCell.locationId,
    weekday: state.selectedCell.weekday,
    dayPart: state.selectedCell.dayPart,
    employeeId
  });
  renderPlanningTables();
  renderConflictsAndSuggestions();
  renderEmployeeSelect();
  schedulePersistWeek();
}

function assignLocationToSelectedEmployeeCell(locationId, dayPart) {
  if (isWeekPlanningFrozen()) return;
  if (!state.selectedEmployeeCell || !locationId || !dayPart) return;
  const { employeeId, weekday } = state.selectedEmployeeCell;
  if (!isOpenFromPeriods(locationId, weekday, dayPart, state.weekStart)) return;
  const exists = state.assignments.some(
    (a) => a.employeeId === employeeId && a.weekday === weekday && a.locationId === locationId && a.dayPart === dayPart
  );
  if (exists) return;
  state.assignments.push({ locationId, weekday, dayPart, employeeId });
  renderPlanningTables();
  renderConflictsAndSuggestions();
  renderEmployeeSelect();
  schedulePersistWeek();
}

function renderLocationSelectForEmployeePlanning() {
  employeeAvailableListEl.innerHTML = "";
  employeeUnavailableListEl.innerHTML = "";
  suggestionListEl.innerHTML = "";
  plannedEmployeeListEl.innerHTML = "";
  conflictListEl.innerHTML = "";
  if (!state.selectedEmployeeCell) {
    selectedCellMetaEl.textContent = "";
    conflictSectionEl.style.display = "none";
    availableSectionEl.style.display = "none";
    return;
  }
  const { employeeId, weekday } = state.selectedEmployeeCell;
  const employee = employees.find((e) => e.id === employeeId);
  const dayAssignments = state.assignments.filter((a) => a.employeeId === employeeId && a.weekday === weekday);
  selectedCellMetaEl.innerHTML =
    `Geselecteerd: ${employee?.name || "-"}<br>` +
    `Datum: ${getDateForWeekday(weekday)}<br>` +
    "Bezetting: locaties";

  dayAssignments.forEach((a) => {
    const chip = document.createElement("div");
    chip.className = "drag-chip person-status-blue";
    chip.innerHTML = `<span class="drag-chip-name">${getLocationName(a.locationId)} (${a.dayPart})</span>`;
    plannedEmployeeListEl.appendChild(chip);
  });
  if (dayAssignments.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note";
    msg.textContent = "Nog geen geplande locaties voor deze medewerker op deze dag.";
    plannedEmployeeListEl.appendChild(msg);
  }

  const assistantQuery = assistantSearchInputEl?.value.toLowerCase().trim() || "";
  const options = getLocationOptionCandidates(state.selectedEmployeeCell).filter((o) =>
    getLocationName(o.locationId).toLowerCase().includes(assistantQuery)
  );
  const preferred = options.filter((o) => o.isPreferred);
  const blocked = options.filter((o) => o.isBlocked);

  preferred.slice(0, 3).forEach((o, idx) => {
    const chip = document.createElement("div");
    chip.className = "drag-chip person-status-blue";
    chip.draggable = true;
    chip.innerHTML = `<span class="drag-chip-name">${idx + 1}. ${getLocationName(o.locationId)} (${o.dayPart})</span>`;
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ locationId: o.locationId, dayPart: o.dayPart }));
    });
    chip.addEventListener("click", () => assignLocationToSelectedEmployeeCell(o.locationId, o.dayPart));
    suggestionListEl.appendChild(chip);
  });

  preferred.slice(3).forEach((o) => {
    const chip = document.createElement("div");
    chip.className = "drag-chip person-status-blue";
    chip.draggable = true;
    chip.innerHTML = `<span class="drag-chip-name">${getLocationName(o.locationId)} (${o.dayPart})</span>`;
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ locationId: o.locationId, dayPart: o.dayPart }));
    });
    chip.addEventListener("click", () => assignLocationToSelectedEmployeeCell(o.locationId, o.dayPart));
    employeeAvailableListEl.appendChild(chip);
  });
  availableSectionEl.style.display = employeeAvailableListEl.children.length > 0 ? "block" : "none";

  blocked.forEach((o) => {
    const chip = document.createElement("div");
    chip.className = "drag-chip person-status-red";
    chip.title = o.reason;
    chip.draggable = true;
    chip.innerHTML = `<span class="drag-chip-name">${getLocationName(o.locationId)} (${o.dayPart})</span>`;
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", JSON.stringify({ locationId: o.locationId, dayPart: o.dayPart }));
    });
    chip.addEventListener("click", () => assignLocationToSelectedEmployeeCell(o.locationId, o.dayPart));
    employeeUnavailableListEl.appendChild(chip);
  });
  if (employeeUnavailableListEl.children.length === 0) {
    const msg = document.createElement("div");
    msg.className = "note";
    msg.textContent = "Geen niet-beschikbare locaties.";
    employeeUnavailableListEl.appendChild(msg);
  }
  const hasDayConflict = hasEmployeeWeekdayConflict(employeeId, weekday);
  const totalHours = getEmployeePlannedHours(employeeId);
  const messages = [];
  if (hasDayConflict) messages.push("Dubbel gepland: medewerker staat op hetzelfde dagdeel op meerdere locaties.");
  if (employee && totalHours > employee.weekHours) {
    messages.push(`Over uren: ${totalHours}/${employee.weekHours} uur ingepland.`);
  }
  if (messages.length > 0) {
    conflictSectionEl.style.display = "block";
    messages.forEach((msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      conflictListEl.appendChild(li);
    });
  } else {
    conflictSectionEl.style.display = "none";
  }
}

function clearSelectedCell() {
  if (!state.selectedCell) return;
  state.assignments = state.assignments.filter(
    (a) =>
      !(a.locationId === state.selectedCell.locationId && a.weekday === state.selectedCell.weekday && a.dayPart === state.selectedCell.dayPart)
  );
  renderPlanningTables();
  renderConflictsAndSuggestions();
  renderEmployeeSelect();
  schedulePersistWeek();
}

function highlightValidDropCells(employeeId) {
  locationPlanningTableEl.querySelectorAll(".planning-cell").forEach((cell) => {
    if (cell.classList.contains("closed")) return;
    const locationId = cell.dataset.location;
    const weekday = Number(cell.dataset.weekday);
    const dayPart = cell.dataset.daypart;
    const canDrop = isOpenFromPeriods(locationId, weekday, dayPart, state.weekStart);
    if (canDrop) cell.classList.add("drop-available");
  });
}

function clearDropHighlights() {
  locationPlanningTableEl.querySelectorAll(".planning-cell.drop-available").forEach((cell) => {
    cell.classList.remove("drop-available");
  });
}

function activatePanel(panelId) {
  state.activePanel = panelId;
  if (panelId !== "locationPlanningPanel") {
    state.selectedCell = null;
  }
  if (panelId !== "employeePlanningPanel") {
    state.selectedEmployeeCell = null;
  }
  panelTabs.forEach((t) => t.classList.remove("active"));
  panels.forEach((p) => p.classList.remove("active"));
  const navTab = document.querySelector(`[data-panel="${panelId}"]`);
  if (navTab) navTab.classList.add("active");
  document.getElementById(panelId).classList.add("active");
  updateToolbarByPanel();
  renderContextControls();
  if (panelId === "publicPanel") {
    void ensurePublicPanelWeek();
  } else {
    renderPublicTable();
  }
  refreshSearch();
}

panelTabs.forEach((tab) => tab.addEventListener("click", () => activatePanel(tab.dataset.panel)));
globalSearchEl?.addEventListener("input", refreshSearch);
locationSearchInputEl?.addEventListener("input", refreshSearch);
employeeSearchInputEl?.addEventListener("input", refreshSearch);
document.getElementById("publishBtn").addEventListener("click", async () => {
  state.published = !state.published;
  if (state.published) {
    state.selectedCell = null;
    state.selectedEmployeeCell = null;
  }
  await refreshPublishedWeeks();
  renderPublicTable();
  renderContextControls();
  syncPlannerAssistantVisibility();
  void persistWeekNow();
});

document.getElementById("publicUnpublishBtn").addEventListener("click", async () => {
  if (!state.published) return;
  const ok = window.confirm(
    "De planning van deze week niet meer tonen op Publieke inzage?\n\n" +
      "De week wordt weer als concept gemarkeerd; je kunt daarna opnieuw publiceren."
  );
  if (!ok) return;
  state.published = false;
  await refreshPublishedWeeks();
  renderPublicTable();
  renderContextControls();
  void persistWeekNow();
});

document.getElementById("publicExportExcelBtn").addEventListener("click", () => exportPublicExcel());
document.getElementById("publicExportPdfBtn").addEventListener("click", () => exportPublicPdf());
document.getElementById("publicCopyLinkBtn").addEventListener("click", () => copyPublicPlanningLink());
document.getElementById("publicSendEmailBtn").addEventListener("click", async () => {
  if (!state.published) {
    window.alert("Publiceer eerst de planning.");
    return;
  }
  if (state.mailEligibleCount <= 0) {
    window.alert("Geen medewerkers met e-mailadres.");
    return;
  }
  const ok = window.confirm(`E-mail planning versturen naar ${formatMedewerkerCount(state.mailEligibleCount)}?`);
  if (!ok) return;

  state.mailSending = true;
  syncPublicPanelActions();
  try {
    const res = await fetch(`/api/planning/public-notify?weekStart=${encodeURIComponent(state.weekStart)}`, {
      method: "POST",
      credentials: "include"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Mail versturen mislukt");
    window.alert(`E-mail verzonden naar ${formatMedewerkerCount(Number(data.sent || 0))}.`);
  } catch (e) {
    window.alert("Mail versturen mislukt.\n\n" + (e.message || e));
  } finally {
    state.mailSending = false;
    await refreshPublicEmailState();
  }
});

document.getElementById("publicSendLocationEmailBtn").addEventListener("click", async () => {
  if (!state.published) {
    window.alert("Publiceer eerst de planning.");
    return;
  }
  if (state.mailLocationEligibleCount <= 0) {
    window.alert("Geen locaties met e-mailadres.");
    return;
  }
  const ok = window.confirm(`E-mail planning versturen naar ${formatLocatieCount(state.mailLocationEligibleCount)}?`);
  if (!ok) return;

  state.mailSending = true;
  syncPublicPanelActions();
  try {
    const res = await fetch(`/api/planning/public-notify-locations?weekStart=${encodeURIComponent(state.weekStart)}`, {
      method: "POST",
      credentials: "include"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Mail versturen mislukt");
    window.alert(`E-mail verzonden naar ${formatLocatieCount(Number(data.sent || 0))}.`);
  } catch (e) {
    window.alert("Mail versturen mislukt.\n\n" + (e.message || e));
  } finally {
    state.mailSending = false;
    await refreshPublicEmailState();
  }
});
document.getElementById("publicModeSelect").addEventListener("change", () => {
  if (state.activePanel === "publicPanel") {
    renderPublicTable();
    refreshSearch();
  }
});
publicWeekSelectEl?.addEventListener("change", async (e) => {
  const selectedWeek = e.target.value;
  if (!selectedWeek) return;
  if (!state.publishedWeeks.includes(selectedWeek)) return;
  await switchToWeek(selectedWeek);
});

document.getElementById("weekStart").addEventListener("change", async (e) => {
  const nextWeek = e.target.value;
  if (state.activePanel === "publicPanel" && !state.publishedWeeks.includes(nextWeek)) {
    window.alert("In Publieke inzage kun je alleen gepubliceerde weken tonen.");
    document.getElementById("weekStart").value = state.weekStart;
    return;
  }
  await switchToWeek(nextWeek);
});
document.getElementById("prevWeekBtn").addEventListener("click", async () => {
  if (state.activePanel === "publicPanel" && state.publishedWeeks.length > 0) {
    const idx = state.publishedWeeks.indexOf(state.weekStart);
    const nextIdx = idx >= 0 ? Math.min(idx + 1, state.publishedWeeks.length - 1) : 0;
    await switchToWeek(state.publishedWeeks[nextIdx]);
    return;
  }
  await switchToWeek(addDaysToIsoDate(state.weekStart, -7));
});
document.getElementById("nextWeekBtn").addEventListener("click", async () => {
  if (state.activePanel === "publicPanel" && state.publishedWeeks.length > 0) {
    const idx = state.publishedWeeks.indexOf(state.weekStart);
    const nextIdx = idx >= 0 ? Math.max(idx - 1, 0) : 0;
    await switchToWeek(state.publishedWeeks[nextIdx]);
    return;
  }
  await switchToWeek(addDaysToIsoDate(state.weekStart, 7));
});
document.getElementById("copyWeekBtn").addEventListener("click", async () => {
  const prevWeek = addDaysToIsoDate(state.weekStart, -7);
  const prevWeekFormatted = formatWeekStart(prevWeek);
  const message =
    `Weet je zeker dat je de gehele planning voor alle locaties en medewerkers van de vorige week (${prevWeekFormatted}) wilt kopieren?\n\n` +
    "Dit overschrijft de huidige data en kan niet worden hersteld.\n\n" +
    "Ja, overschrijven = OK\n" +
    "Nee, annuleren = Annuleren";
  const confirmed = window.confirm(message);
  if (!confirmed) return;
  planningBootDone = false;
  try {
    const res = await fetch(`/api/planning/week?weekStart=${encodeURIComponent(prevWeek)}`, { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    state.assignments = data.assignments || [];
    state.published = false;
    document.getElementById("weekStart").value = state.weekStart;
    renderPlanningTables();
    renderPublicTable();
    renderContextControls();
    await persistWeekNow();
    window.alert("Vorige weekplanning is gekopieerd en huidige planning is opgeslagen.");
  } catch (err) {
    console.error(err);
    window.alert("Kopiëren mislukt. Controleer of de vorige week bestaat.");
  }
  planningBootDone = true;
});
document.getElementById("backToLocationsBtn").addEventListener("click", () => activatePanel("locationsPanel"));
document.getElementById("backToEmployeesBtn").addEventListener("click", () => activatePanel("employeesPanel"));
document.getElementById("deleteLocationBtn").addEventListener("click", async () => {
  const location = locations.find((l) => l.id === state.selectedLocationId);
  if (!location) return;
  const msg =
    `Weet je het zeker?\n\n` +
    `Locatie "${location.name}" wordt permanent verwijderd. Alle perioden, alle planning voor deze locatie in elke week, ` +
    `en de koppeling in medewerkersvoorkeuren gaan verloren.\n\n` +
    `Dit kan niet ongedaan worden.`;
  if (!window.confirm(msg)) return;
  const id = state.selectedLocationId;
  try {
    const res = await fetch(`/api/planning/location/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    locations = locations.filter((l) => l.id !== id);
    state.assignments = state.assignments.filter((a) => a.locationId !== id);
    employees.forEach((e) => {
      e.preferredLocationIds = (e.preferredLocationIds || []).filter((lid) => lid !== id);
    });
    document.getElementById("locationDetailValidation").textContent = "";
    renderLocationList();
    renderLocationFilterOptions();
    renderPlanningTables();
    activatePanel("locationsPanel");
    if (planningBootDone) void persistWeekNow();
    await refreshPublicEmailState();
  } catch (e) {
    window.alert("Verwijderen mislukt: " + (e.message || e));
  }
});

document.getElementById("saveLocationDetailBtn").addEventListener("click", async () => {
  const name = document.getElementById("locationDetailNameInput").value.trim();
  const place = document.getElementById("locationDetailPlaceInput").value.trim();
  const emailRaw = (document.getElementById("locationDetailEmailInput")?.value || "").trim();
  const minEmployees = Number(document.getElementById("locationDetailMinEmployeesInput")?.value || 0);
  const maxEmployees = Number(document.getElementById("locationDetailMaxEmployeesInput")?.value || 0);
  if (!name || !place) {
    document.getElementById("locationDetailValidation").textContent = "Naam en plaats zijn verplicht.";
    return;
  }
  if (!Number.isFinite(minEmployees) || minEmployees < 1 || !Number.isInteger(minEmployees)) {
    document.getElementById("locationDetailValidation").textContent = "Minimale bezetting moet een geheel getal vanaf 1 zijn.";
    return;
  }
  if (!Number.isFinite(maxEmployees) || maxEmployees < 1 || !Number.isInteger(maxEmployees)) {
    document.getElementById("locationDetailValidation").textContent = "Maximale bezetting moet een geheel getal vanaf 1 zijn.";
    return;
  }
  if (maxEmployees < minEmployees) {
    document.getElementById("locationDetailValidation").textContent = "Maximale bezetting moet groter of gelijk zijn aan minimale bezetting.";
    return;
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    document.getElementById("locationDetailValidation").textContent = "Ongeldig e-mailadres.";
    return;
  }
  const location = locations.find((l) => l.id === state.selectedLocationId);
  if (!location) return;
  location.name = name;
  location.place = place;
  location.email = emailRaw || undefined;
  location.minEmployees = minEmployees;
  location.maxEmployees = maxEmployees;
  readLocationPeriodsFromDetailForm(location);
  try {
    const res = await fetch(`/api/planning/location/${state.selectedLocationId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: location.name,
        place: location.place,
        email: emailRaw || null,
        minEmployees: location.minEmployees,
        maxEmployees: location.maxEmployees,
        periods: location.periods
      })
    });
    if (!res.ok) throw new Error(await res.text());
  } catch (e) {
    document.getElementById("locationDetailValidation").textContent = "Opslaan mislukt: " + (e.message || e);
    return;
  }
  document.getElementById("locationDetailValidation").textContent = "";
  renderLocationList();
  renderLocationFilterOptions();
  renderPlanningTables();
  activatePanel("locationsPanel");
  await refreshPublicEmailState();
});
document.getElementById("addLocationPeriodBtn").addEventListener("click", () => {
  const location = locations.find((l) => l.id === state.selectedLocationId);
  if (!location) return;
  readLocationPeriodsFromDetailForm(location);
  const previousPeriod = location.periods[location.periods.length - 1] || null;
  location.periods.push(createDefaultPeriod(previousPeriod));
  renderLocationPeriods(location);
});
document.getElementById("deleteEmployeeBtn").addEventListener("click", async () => {
  const employee = employees.find((e) => e.id === state.selectedEmployeeId);
  if (!employee) return;
  const msg =
    `Weet je het zeker?\n\n` +
    `Medewerker "${employee.name}" wordt permanent verwijderd. Alle afwezigheidsregels ` +
    `en alle planning waarin deze medewerker voorkomt (in elke week) gaan verloren.\n\n` +
    `Dit kan niet ongedaan worden.`;
  if (!window.confirm(msg)) return;
  const id = state.selectedEmployeeId;
  try {
    const res = await fetch(`/api/planning/employee/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    employees = employees.filter((e) => e.id !== id);
    state.assignments = state.assignments.filter((a) => a.employeeId !== id);
    document.getElementById("employeeDetailValidation").textContent = "";
    renderEmployeeList();
    renderPlanningTables();
    activatePanel("employeesPanel");
    if (planningBootDone) void persistWeekNow();
  } catch (e) {
    window.alert("Verwijderen mislukt: " + (e.message || e));
  }
});

document.getElementById("saveEmployeeDetailBtn").addEventListener("click", async () => {
  const name = document.getElementById("employeeDetailNameInput").value.trim();
  const businessEmail = document.getElementById("employeeDetailBusinessEmailInput").value.trim();
  const privateEmail = document.getElementById("employeeDetailPrivateEmailInput").value.trim();
  const planningEmailIsPrivate = document.getElementById("employeeDetailPlanningEmailIsPrivateInput").checked;
  const contractType = document.getElementById("employeeDetailContractInput").value;
  const weekHours = Number(document.getElementById("employeeDetailHoursInput").value || 0);
  const endDate = document.getElementById("employeeDetailEndDateInput").value || "";
  const days = [1, 2, 3, 4, 5].filter((d) => document.getElementById(`employeeDay${d}`).checked);
  const preferredLocationIds = Array.from(document.getElementById("employeeSelectedLocations").options).map((o) => o.value);
  const rows = employeeAbsenceTableBodyEl
    ? Array.from(employeeAbsenceTableBodyEl.querySelectorAll("tr"))
    : [];
  const absences = rows
    .map((row) => {
      if (row.dataset.rowType === "saved") {
        const normalizedSavedAbsence = normalizeAbsenceRange({
          startDate: row.dataset.startDate || "",
          endDate: row.dataset.endDate || "",
          reason: row.dataset.reason || "Ziek"
        });
        return normalizedSavedAbsence || null;
      }
      const normalizedDraftAbsence = normalizeAbsenceRange({
        startDate: row.querySelector(".absence-start-date")?.value || "",
        endDate: row.querySelector(".absence-end-date")?.value || "",
        reason: row.querySelector(".absence-reason")?.value || "Ziek"
      });
      return normalizedDraftAbsence || null;
    })
    .filter(Boolean);
  if (!name || weekHours <= 0) {
    document.getElementById("employeeDetailValidation").textContent = "Naam en geldige uren zijn verplicht.";
    return;
  }
  if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
    document.getElementById("employeeDetailValidation").textContent = "Voer een geldig zakelijk e-mailadres in.";
    return;
  }
  if (privateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privateEmail)) {
    document.getElementById("employeeDetailValidation").textContent = "Voer een geldig prive e-mailadres in.";
    return;
  }
  if (days.length === 0) {
    document.getElementById("employeeDetailValidation").textContent = "Selecteer minimaal 1 werkdag.";
    return;
  }
  const employee = employees.find((e) => e.id === state.selectedEmployeeId);
  if (!employee) return;
  employee.name = name;
  employee.privateEmail = privateEmail;
  employee.planningEmailIsPrivate = planningEmailIsPrivate;
  employee.email = businessEmail;
  employee.contractType = contractType;
  employee.weekHours = weekHours;
  employee.endDate = endDate;
  employee.days = days;
  employee.preferredLocationIds = preferredLocationIds;
  employee.absences = absences;
  try {
    const res = await fetch(`/api/planning/employee/${state.selectedEmployeeId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: employee.name,
        email: businessEmail || "",
        privateEmail: employee.privateEmail || "",
        planningEmailIsPrivate: employee.planningEmailIsPrivate !== false,
        contractType: employee.contractType,
        weekHours: employee.weekHours,
        endDate: employee.endDate || "",
        days: employee.days,
        preferredLocationIds: employee.preferredLocationIds,
        absences: employee.absences
      })
    });
    if (!res.ok) throw new Error(await res.text());
  } catch (e) {
    document.getElementById("employeeDetailValidation").textContent = "Opslaan mislukt: " + (e.message || e);
    return;
  }
  document.getElementById("employeeDetailValidation").textContent = "";
  renderEmployeeList();
  renderPlanningTables();
  activatePanel("employeesPanel");
});
document.getElementById("addEmployeeAbsenceBtn").addEventListener("click", () => addEmployeeAbsenceDraftRow("", "", "Ziek"));
document.getElementById("copyEmployeePersonalPlanningLinkBtn").addEventListener("click", () => {
  const input = document.getElementById("employeePersonalPlanningLinkInput");
  const url = (input?.value || "").trim();
  if (!url) return;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText(url)
      .then(() => window.alert("Persoonlijke link is gekopieerd naar het klembord."))
      .catch(() => window.prompt("Kopieer deze link handmatig:", url));
  } else {
    window.prompt("Kopieer deze link:", url);
  }
});
document.getElementById("openEmployeePersonalPlanningLinkBtn").addEventListener("click", () => {
  const input = document.getElementById("employeePersonalPlanningLinkInput");
  const url = (input?.value || "").trim();
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
});
document.getElementById("copyLocationPlanningLinkBtn").addEventListener("click", () => {
  const input = document.getElementById("locationPlanningLinkInput");
  const url = (input?.value || "").trim();
  if (!url || url === "Locatie link laden...") return;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText(url)
      .then(() => window.alert("Locatie link is gekopieerd naar het klembord."))
      .catch(() => window.prompt("Kopieer deze link handmatig:", url));
  } else {
    window.prompt("Kopieer deze link:", url);
  }
});
document.getElementById("openLocationPlanningLinkBtn").addEventListener("click", () => {
  const input = document.getElementById("locationPlanningLinkInput");
  const url = (input?.value || "").trim();
  if (!url || url === "Locatie link laden...") return;
  window.open(url, "_blank", "noopener,noreferrer");
});
document.getElementById("moveLocationRightBtn").addEventListener("click", () => {
  moveSelectedOptions(document.getElementById("employeeAvailableLocations"), document.getElementById("employeeSelectedLocations"));
});
document.getElementById("moveLocationLeftBtn").addEventListener("click", () => {
  moveSelectedOptions(document.getElementById("employeeSelectedLocations"), document.getElementById("employeeAvailableLocations"));
});
document.getElementById("employeeAvailableLocations").addEventListener("dblclick", (e) => {
  moveOptionByDoubleClick(
    document.getElementById("employeeAvailableLocations"),
    document.getElementById("employeeSelectedLocations"),
    e
  );
});
document.getElementById("employeeSelectedLocations").addEventListener("dblclick", (e) => {
  moveOptionByDoubleClick(
    document.getElementById("employeeSelectedLocations"),
    document.getElementById("employeeAvailableLocations"),
    e
  );
});
document.getElementById("quickFilterWrap").addEventListener("change", (e) => {
  state.locationCellFilter = e.target.value;
  applyLocationCellFilter();
});
document.getElementById("locationFilterWrap").addEventListener("change", (e) => {
  state.locationFilter = e.target.value;
  applyLocationCellFilter();
});
document.getElementById("assistantSearchInput").addEventListener("input", () => {
  renderConflictsAndSuggestions();
  renderEmployeeSelect();
});

document.getElementById("addLocationBtn").addEventListener("click", async () => {
  const name = window.prompt("Naam van de nieuwe locatie:", "Nieuwe locatie");
  if (name === null) return;
  const place = window.prompt("Plaatsnaam:", "Leiden");
  if (place === null) return;
  const n = name.trim() || "Nieuwe locatie";
  const p = place.trim() || "Leiden";
  try {
    const res = await fetch("/api/planning/location", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: n,
        place: p,
        minEmployees: DEFAULT_MIN_EMPLOYEES,
        maxEmployees: DEFAULT_MAX_EMPLOYEES
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    locations.push(normalizeLocationCapacityShape(data.location));
    renderLocationList();
    renderLocationFilterOptions();
    renderPlanningTables();
    document.getElementById("locationDetailValidation").textContent = "";
    openLocationDetail(data.location.id);
  } catch (e) {
    window.alert("Locatie aanmaken mislukt: " + (e.message || e));
  }
});

document.getElementById("addEmployeeBtn").addEventListener("click", async () => {
  const name = window.prompt("Naam van de nieuwe medewerker:", "Nieuwe medewerker");
  if (name === null) return;
  const businessEmail = window.prompt("Zakelijk e-mailadres (optioneel):", "") || "";
  const privateEmail = window.prompt("Prive e-mailadres (optioneel):", "") || "";
  const usePrivateForPlanning = window.confirm(
    "Gebruik prive e-mail voor planning versturen?\n\nOK = prive, Annuleren = zakelijk."
  );
  const n = name.trim() || "Nieuwe medewerker";
  const be = businessEmail.trim();
  const pe = privateEmail.trim();
  if (be && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(be)) {
    window.alert("Ongeldig zakelijk e-mailadres.");
    return;
  }
  if (pe && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pe)) {
    window.alert("Ongeldig prive e-mailadres.");
    return;
  }
  const preferredLocationIds = locations.length ? [locations[0].id] : [];
  try {
    const res = await fetch("/api/planning/employee", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: n,
        email: be,
        privateEmail: pe,
        planningEmailIsPrivate: usePrivateForPlanning,
        preferredLocationIds
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    employees.push(normalizeEmployeeEmailShape(data.employee));
    renderEmployeeList();
    renderPlanningTables();
    document.getElementById("employeeDetailValidation").textContent = "";
    openEmployeeDetail(data.employee.id);
    await refreshPublicEmailState();
  } catch (e) {
    window.alert("Medewerker aanmaken mislukt: " + (e.message || e));
  }
});

(async function bootPlanningApp() {
  const shell = document.querySelector(".app-shell");
  try {
    const seededMaster = await loadBootstrapFromApi();
    await loadWeekFromApi(state.weekStart);
    if (seededMaster && state.assignments.length === 0) {
      seedAssignments();
      await persistWeekNow();
    }
    planningBootDone = true;
    renderLocationFilterOptions();
    renderLocationList();
    renderEmployeeList();
    renderPlanningTables();
    await refreshPublishedWeeks();
    renderPublicTable();
    await refreshPublicEmailState();
    renderEmployeeSelect();
    activatePanel("locationsPanel");
    notifyParentPlanningShell("ready");
  } catch (e) {
    console.error(e);
    if (shell) {
      shell.innerHTML =
        `<div style="padding:2rem;font-family:system-ui,sans-serif;max-width:520px;">` +
        `<p><strong>Planningdata laden mislukt.</strong></p>` +
        `<p>Controleer of je bent ingelogd als admin en voer in Supabase <code>supabase-planning-schema.sql</code> uit. ` +
        `Heb je net locatie-e-mail toegevoegd? Voer dan ook <code>supabase-locations-email.sql</code> uit.</p>` +
        `<p style="color:#b42318;">${String(e.message || e)}</p></div>`;
    }
    notifyParentPlanningShell("error");
  }
})();
