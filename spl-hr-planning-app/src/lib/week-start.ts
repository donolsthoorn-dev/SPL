const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDateStrict(isoDate: string): Date | null {
  if (!ISO_DATE_RE.test(isoDate)) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isMondayIsoDate(isoDate: string): boolean {
  const parsed = parseIsoDateStrict(isoDate);
  if (!parsed) return false;
  return parsed.getUTCDay() === 1;
}

export function assertMondayWeekStart(isoDate: string): void {
  if (!isMondayIsoDate(isoDate)) {
    throw new Error(`weekStart moet een maandag zijn (ontvangen: ${isoDate})`);
  }
}
