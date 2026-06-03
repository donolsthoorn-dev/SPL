"use strict";
var SplPlanningCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/planning-core.ts
  var planning_core_exports = {};
  __export(planning_core_exports, {
    PLANNING_DAY_PARTS: () => PLANNING_DAY_PARTS,
    addDaysToIsoDate: () => addDaysToIsoDate,
    formatEmployeeNameForLocationCell: () => formatEmployeeNameForLocationCell,
    formatIsoDateLocal: () => formatIsoDateLocal,
    getEmployeeAbsenceForWeekday: () => getEmployeeAbsenceForWeekday,
    getEmployeeName: () => getEmployeeName,
    getEmployeePlannedHours: () => getEmployeePlannedHours,
    getEmployeeTotalHoursCellClass: () => getEmployeeTotalHoursCellClass,
    getEmployeeWeekdayDisplayText: () => getEmployeeWeekdayDisplayText,
    getIsoDateForWeekday: () => getIsoDateForWeekday,
    getLocationName: () => getLocationName,
    getScheduledHoursForAssignment: () => getScheduledHoursForAssignment,
    getTimeslotAssignments: () => getTimeslotAssignments,
    hasEmployeeTimeslotConflict: () => hasEmployeeTimeslotConflict,
    isAbsenceOnDate: () => isAbsenceOnDate,
    isDuintopLocation: () => isDuintopLocation,
    isEmployeeAvailableForWeekday: () => isEmployeeAvailableForWeekday,
    isEmployeeOnLeaveForWeekday: () => isEmployeeOnLeaveForWeekday,
    isEmployeePlanableForWeekday: () => isEmployeePlanableForWeekday,
    isEmployeeSickForWeekday: () => isEmployeeSickForWeekday,
    isOpenFromPeriods: () => isOpenFromPeriods,
    isOpenFromPeriodsById: () => isOpenFromPeriodsById,
    normalizeAbsenceRange: () => normalizeAbsenceRange,
    parseIsoDateLocal: () => parseIsoDateLocal,
    timeslotHasDuplicateConflict: () => timeslotHasDuplicateConflict,
    validateWeekAssignments: () => validateWeekAssignments
  });
  var PLANNING_DAY_PARTS = ["ochtend", "middag"];
  var WEEKDAY_TO_SLOT_KEY = { 1: "ma", 2: "di", 3: "wo", 4: "do", 5: "vr" };
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
  function getIsoDateForWeekday(weekStart, weekday) {
    return addDaysToIsoDate(weekStart, weekday - 1);
  }
  function getScheduledHoursForAssignment(locations, locationId, weekday, dayPart, weekStart) {
    const location = locations.find((l) => l.id === locationId);
    if (!location) return 0;
    const dayKey = WEEKDAY_TO_SLOT_KEY[weekday];
    if (!dayKey) return 0;
    const targetDate = addDaysToIsoDate(weekStart, weekday - 1);
    const period = location.periods.find((p) => targetDate >= p.start && targetDate <= p.end);
    if (!period) return 0;
    const slots = period.slots;
    return Number(slots?.[dayKey]?.[dayPart] || 0);
  }
  function getEmployeePlannedHours(snapshot, employeeId) {
    const hours = snapshot.assignments.filter((a) => a.employeeId === employeeId).reduce(
      (total, assignment) => total + getScheduledHoursForAssignment(
        snapshot.locations,
        assignment.locationId,
        assignment.weekday,
        assignment.dayPart,
        snapshot.weekStart
      ),
      0
    );
    return Math.round(hours * 100) / 100;
  }
  function isOpenFromPeriods(loc, weekday, dayPart, weekStart) {
    if (!loc) return false;
    const dayKey = WEEKDAY_TO_SLOT_KEY[weekday];
    if (!dayKey) return false;
    const targetDate = addDaysToIsoDate(weekStart, weekday - 1);
    return loc.periods.some((period) => {
      const inRange = targetDate >= period.start && targetDate <= period.end;
      if (!inRange) return false;
      const slots = period.slots;
      return Number(slots?.[dayKey]?.[dayPart] || 0) > 0;
    });
  }
  function isOpenFromPeriodsById(locations, locationId, weekday, dayPart, weekStart) {
    return isOpenFromPeriods(locations.find((l) => l.id === locationId), weekday, dayPart, weekStart);
  }
  function normalizeAbsenceRange(absence) {
    const startDate = String(absence.startDate ?? absence.date ?? "").trim();
    const endDateRaw = String(absence.endDate ?? "").trim();
    const endDate = endDateRaw || startDate;
    if (!startDate || !endDate) return null;
    return startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };
  }
  function isAbsenceOnDate(absence, dayIso) {
    const normalized = normalizeAbsenceRange(absence);
    if (!normalized) return false;
    return dayIso >= normalized.startDate && dayIso <= normalized.endDate;
  }
  function isDuintopLocation(locations, locationId) {
    const location = locations.find((l) => l.id === locationId);
    if (!location) return false;
    return /^duintop\s/i.test(String(location.name || "").trim());
  }
  function getTimeslotAssignments(assignments, employeeId, weekday, dayPart) {
    return assignments.filter(
      (a) => a.employeeId === employeeId && a.weekday === weekday && a.dayPart === dayPart
    );
  }
  function timeslotHasDuplicateConflict(locations, assignments, employeeId, weekday, dayPart) {
    const slotAssignments = getTimeslotAssignments(assignments, employeeId, weekday, dayPart);
    if (slotAssignments.length <= 1) return false;
    const locationIds = [...new Set(slotAssignments.map((a) => a.locationId))];
    return !locationIds.every((id) => isDuintopLocation(locations, id));
  }
  function hasEmployeeTimeslotConflict(locations, assignments, employeeId) {
    const keys = /* @__PURE__ */ new Set();
    assignments.filter((a) => a.employeeId === employeeId).forEach((a) => keys.add(`${a.weekday}-${a.dayPart}`));
    for (const key of keys) {
      const [weekday, dayPart] = key.split("-");
      if (timeslotHasDuplicateConflict(locations, assignments, employeeId, Number(weekday), dayPart)) {
        return true;
      }
    }
    return false;
  }
  function isEmployeeAvailableForWeekday(snapshot, employee, weekday) {
    if (!employee.days.includes(weekday)) return false;
    const dayIso = getIsoDateForWeekday(snapshot.weekStart, weekday);
    const isAbsent = (employee.absences || []).some((a) => isAbsenceOnDate(a, dayIso));
    if (isAbsent) return false;
    return snapshot.locations.some(
      (loc) => PLANNING_DAY_PARTS.some((dayPart) => isOpenFromPeriods(loc, weekday, dayPart, snapshot.weekStart))
    );
  }
  function isEmployeePlanableForWeekday(employee, weekday, weekStart) {
    if (!employee.days.includes(weekday)) return false;
    const dayIso = getIsoDateForWeekday(weekStart, weekday);
    return !(employee.absences || []).some((a) => isAbsenceOnDate(a, dayIso));
  }
  function getEmployeeAbsenceForWeekday(employee, weekday, weekStart) {
    const dayIso = getIsoDateForWeekday(weekStart, weekday);
    return (employee.absences || []).find((a) => isAbsenceOnDate(a, dayIso)) || null;
  }
  function isEmployeeSickForWeekday(employee, weekday, weekStart) {
    const absence = getEmployeeAbsenceForWeekday(employee, weekday, weekStart);
    if (!absence) return false;
    return /ziek/i.test(String(absence.reason || ""));
  }
  function isEmployeeOnLeaveForWeekday(employee, weekday, weekStart) {
    const absence = getEmployeeAbsenceForWeekday(employee, weekday, weekStart);
    if (!absence) return false;
    return /verlof/i.test(String(absence.reason || ""));
  }
  function getLocationName(locations, id) {
    return locations.find((l) => l.id === id)?.name ?? "-";
  }
  function getEmployeeName(employees, id) {
    return employees.find((e) => e.id === id)?.name ?? "-";
  }
  function formatEmployeeNameForLocationCell(employee, name, weekday, weekStart) {
    if (!name || name === "-") return "";
    if (employee && isEmployeeSickForWeekday(employee, weekday, weekStart)) return `${name} (ziek)`;
    if (employee && isEmployeeOnLeaveForWeekday(employee, weekday, weekStart)) return `${name} (verlof)`;
    return name;
  }
  function getEmployeeWeekdayDisplayText(snapshot, emp, weekday, assignmentSeparator) {
    const dayAssignments = snapshot.assignments.filter(
      (a) => a.employeeId === emp.id && a.weekday === weekday
    );
    const isSickDay = isEmployeeSickForWeekday(emp, weekday, snapshot.weekStart);
    const isLeaveDay = isEmployeeOnLeaveForWeekday(emp, weekday, snapshot.weekStart);
    const assignmentText = dayAssignments.map((a) => `${getLocationName(snapshot.locations, a.locationId)} (${a.dayPart})`).join(assignmentSeparator);
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
  function getEmployeeTotalHoursCellClass(planned, weekHours) {
    if (planned > weekHours) return "danger";
    if (planned === weekHours) return "ok";
    return "";
  }
  function dedupeAssignments(assignments) {
    const uniqueByKey = /* @__PURE__ */ new Map();
    for (const assignment of assignments) {
      const key = [
        assignment.locationId,
        assignment.weekday,
        assignment.dayPart,
        assignment.employeeId
      ].join("|");
      uniqueByKey.set(key, assignment);
    }
    return [...uniqueByKey.values()];
  }
  function validateWeekAssignments(snapshot, assignments) {
    const errors = [];
    const deduped = dedupeAssignments(assignments);
    const employeesById = new Map(snapshot.employees.map((e) => [e.id, e]));
    const locationsById = new Map(snapshot.locations.map((l) => [l.id, l]));
    deduped.forEach((a, index) => {
      const loc = locationsById.get(a.locationId);
      const emp = employeesById.get(a.employeeId);
      const label = `Toewijzing ${index + 1}`;
      if (!loc) {
        errors.push(`${label}: onbekende locatie.`);
        return;
      }
      if (!emp) {
        errors.push(`${label}: onbekende medewerker.`);
        return;
      }
      if (!isOpenFromPeriods(loc, a.weekday, a.dayPart, snapshot.weekStart)) {
        errors.push(
          `${label}: ${emp.name} op ${loc.name} (${a.dayPart}) is geen open dagdeel in deze week.`
        );
      }
    });
    const employeeIds = [...new Set(deduped.map((a) => a.employeeId))];
    for (const employeeId of employeeIds) {
      const emp = employeesById.get(employeeId);
      if (!emp) continue;
      if (hasEmployeeTimeslotConflict(snapshot.locations, deduped, employeeId)) {
        errors.push(`${emp.name}: dubbele inplanning op hetzelfde dagdeel (conflict).`);
      }
      const planned = getEmployeePlannedHours({ ...snapshot, assignments: deduped }, employeeId);
      if (planned > emp.weekHours) {
        errors.push(
          `${emp.name}: ${planned} uur ingepland, meer dan contract (${emp.weekHours} uur).`
        );
      }
    }
    return { ok: errors.length === 0, errors };
  }
  return __toCommonJS(planning_core_exports);
})();
