"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WireframeAssignment, WireframeEmployee, WireframeLocation } from "@/lib/planning-data";
import {
  buildPublicEmployeeMatrix,
  buildPublicEmployeeTableHtml,
  buildPublicLocationMatrix,
  buildPublicLocationTableHtml,
  formatWeekPlanLabelNl,
  getIsoWeekNumber,
  matrixToCsvSemicolon,
  matrixToHtmlTable,
} from "@/lib/publieke-planning-renderer";

export type PubliekePlanningSnapshot = {
  weekStart: string;
  locations: WireframeLocation[];
  employees: WireframeEmployee[];
  assignments: WireframeAssignment[];
};

export type PersonalPlanningWeekNav = {
  prev?: { weekStart: string; href: string };
  next?: { weekStart: string; href: string };
};

function triggerDownloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtmlForPdfTitle(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function PubliekePlanningClient({
  snapshot,
  personalPlanning,
  restrictedEmployeeName,
  weekNav,
}: {
  snapshot: PubliekePlanningSnapshot;
  /** Persoonlijke token-link (medewerker), los van of de naam in stamdata gezet is. */
  personalPlanning?: boolean;
  restrictedEmployeeName?: string;
  weekNav?: PersonalPlanningWeekNav;
}) {
  const [mode, setMode] = useState<"location" | "employee">(personalPlanning ? "employee" : "location");
  const effectiveMode = personalPlanning ? "employee" : mode;

  const weekPlanLabel = formatWeekPlanLabelNl(snapshot.weekStart);
  const pageHeading = personalPlanning
    ? `Persoonlijke planning — ${weekPlanLabel}`
    : `Publieke inzage — ${weekPlanLabel}`;

  useEffect(() => {
    const label = formatWeekPlanLabelNl(snapshot.weekStart);
    document.title = personalPlanning
      ? `Persoonlijke planning — ${label} | SPL`
      : `Publieke planning — ${label} | SPL`;
  }, [personalPlanning, snapshot.weekStart]);

  const tableHtml = useMemo(() => {
    const s = {
      weekStart: snapshot.weekStart,
      locations: snapshot.locations,
      employees: snapshot.employees,
      assignments: snapshot.assignments,
    };
    return effectiveMode === "employee" ? buildPublicEmployeeTableHtml(s) : buildPublicLocationTableHtml(s);
  }, [snapshot, effectiveMode]);

  const exportExcel = useCallback(() => {
    const s = {
      weekStart: snapshot.weekStart,
      locations: snapshot.locations,
      employees: snapshot.employees,
      assignments: snapshot.assignments,
    };
    const matrix = effectiveMode === "employee" ? buildPublicEmployeeMatrix(s) : buildPublicLocationMatrix(s);
    const csv = matrixToCsvSemicolon(matrix);
    const suffix = effectiveMode === "employee" ? "medewerker" : "locatie";
    triggerDownloadCsv(csv, `spl-planning-${snapshot.weekStart}-${suffix}.csv`);
  }, [snapshot, effectiveMode]);

  const exportPdf = useCallback(() => {
    const s = {
      weekStart: snapshot.weekStart,
      locations: snapshot.locations,
      employees: snapshot.employees,
      assignments: snapshot.assignments,
    };
    const matrix = effectiveMode === "employee" ? buildPublicEmployeeMatrix(s) : buildPublicLocationMatrix(s);
    const title = `SPL planning week ${getIsoWeekNumber(snapshot.weekStart)} — ${
      effectiveMode === "employee" ? "per medewerker" : "per locatie"
    }`;
    const inner = matrixToHtmlTable(matrix);
    const w = window.open("", "_blank");
    if (!w) {
      window.alert("Pop-up geblokkeerd. Sta pop-ups toe om te kunnen afdrukken / PDF op te slaan.");
      return;
    }
    w.document.write(
      `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"/><title>${escapeHtmlForPdfTitle(title)}</title>` +
        "<style>" +
        "body{font-family:system-ui,sans-serif;padding:16px;}" +
        "h1{font-size:1.1rem;margin:0 0 12px;}" +
        "table{border-collapse:collapse;width:100%;font-size:11px;}" +
        "th,td{border:1px solid #333;padding:6px 8px;text-align:left;vertical-align:top;}" +
        "th{background:#f0f0f0;}" +
        "</style></head><body>" +
        `<h1>${escapeHtmlForPdfTitle(title)}</h1><table>${inner}</table>` +
        '<p style="font-size:10px;color:#666;margin-top:12px;">Kies in dit venster Afdrukken (Ctrl+P / Cmd+P) en daarna &ldquo;Opslaan als PDF&rdquo;.</p>' +
        "</body></html>",
    );
    w.document.close();
    w.focus();
    requestAnimationFrame(() => {
      w.print();
    });
  }, [snapshot, effectiveMode]);

  return (
    <div className="pp-root">
      <section className="panel card">
        <div className="panel-header">
          <h3>{pageHeading}</h3>
          <div className="header-actions">
            {personalPlanning && weekNav && (weekNav.prev || weekNav.next) ? (
              <nav className="pp-week-nav" aria-label="Andere gepubliceerde weken">
                {weekNav.prev ? (
                  <button
                    type="button"
                    className="ghost-btn"
                    title={formatWeekPlanLabelNl(weekNav.prev.weekStart)}
                    onClick={() => {
                      window.location.assign(weekNav.prev!.href);
                    }}
                  >
                    Vorige week
                  </button>
                ) : null}
                {weekNav.next ? (
                  <button
                    type="button"
                    className="ghost-btn"
                    title={formatWeekPlanLabelNl(weekNav.next.weekStart)}
                    onClick={() => {
                      window.location.assign(weekNav.next!.href);
                    }}
                  >
                    Volgende week
                  </button>
                ) : null}
              </nav>
            ) : null}
            <select
              id="publicModeSelect"
              value={effectiveMode}
              disabled={Boolean(personalPlanning)}
              onChange={(e) => setMode(e.target.value as "location" | "employee")}
              aria-label="Weergave"
            >
              <option value="location">Per locatie</option>
              <option value="employee">Per medewerker</option>
            </select>
            <button type="button" className="ghost-btn" onClick={exportExcel} title="Download als Excel (.csv)">
              Excel
            </button>
            <button type="button" className="ghost-btn" onClick={exportPdf} title="Open afdrukvenster (opslaan als PDF)">
              PDF
            </button>
          </div>
        </div>
        <div className="note pp-muted" style={{ marginBottom: "0.75rem" }}>
          {personalPlanning
            ? restrictedEmployeeName?.trim()
              ? `Persoonlijke alleen-lezen weergave voor ${restrictedEmployeeName.trim()}.`
              : "Persoonlijke alleen-lezen weergave."
            : "Alleen-lezen weergave van de gepubliceerde planning. Kies per locatie of per medewerker."}
        </div>
        <div className="table-wrap">
          <table className="schedule-table" dangerouslySetInnerHTML={{ __html: tableHtml }} />
        </div>
      </section>
    </div>
  );
}
