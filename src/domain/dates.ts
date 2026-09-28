/**
 * Small, dependency-free date helpers. Everything is computed in UTC so that
 * an ISO date means the same day for every user regardless of time zone.
 */

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ISO_PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = parseIsoDate(value);
  return toIsoDate(d) === value; // rejects 2026-02-31
}

export function isIsoPeriod(value: string): boolean {
  return ISO_PERIOD.test(value);
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  // Use the *local* calendar day of the user, expressed as an ISO date.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(iso).getTime() + days * DAY_MS));
}

/** First day of the month `offset` months away from the month of `iso`. */
export function monthStart(iso: string, offset = 0): string {
  const d = parseIsoDate(iso);
  return toIsoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)));
}

/** Last day of the month `offset` months away from the month of `iso`. */
export function monthEnd(iso: string, offset = 0): string {
  const d = parseIsoDate(iso);
  return toIsoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 0)));
}

/** `YYYY-MM` period `offset` months away from the month of `iso`. */
export function periodOf(iso: string, offset = 0): string {
  return monthStart(iso, offset).slice(0, 7);
}

/** Every month (as `YYYY-MM-01`) touched by the inclusive range. */
export function monthsInRange(startIso: string, endIso: string): string[] {
  const months: string[] = [];
  let cursor = monthStart(startIso);
  const last = monthStart(endIso);
  while (cursor <= last) {
    months.push(cursor);
    cursor = monthStart(cursor, 1);
  }
  return months;
}
