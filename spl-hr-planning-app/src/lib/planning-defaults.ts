import type { WireframePeriod } from "@/lib/planning-data";

/** Zelfde default als `createDefaultPeriod()` in wireframe.js (zonder kopie). */
export function defaultLocationPeriod(): WireframePeriod {
  return {
    start: "2026-04-01",
    end: "2026-12-31",
    slots: {
      ma: { ochtend: 4.5, middag: 0 },
      di: { ochtend: 4.5, middag: 0 },
      wo: { ochtend: 4.5, middag: 0 },
      do: { ochtend: 4.5, middag: 0 },
      vr: { ochtend: 4.5, middag: 0 },
    },
  };
}
