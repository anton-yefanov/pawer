import type { DateRange } from '@/lib/analytics-period';

export type Delta = { percent: number; direction: 'up' | 'down' | 'flat' };

/**
 * The window of equal length immediately before `range`.
 *
 * Null for "all time", whose range starts at epoch 0 — there is nothing before
 * a user's first workout to compare against, and the span would reach back to
 * 1900.
 */
export function previousRange(range: DateRange): DateRange | null {
  if (range.from === 0) return null;
  const span = range.to - range.from;
  return { from: range.from - span, to: range.from };
}

/**
 * Null rather than a percentage when the previous period is empty: every first
 * period would otherwise read as an infinite improvement.
 *
 * Sub-1% moves collapse to flat so a rounding artefact doesn't render as "0%".
 */
export function delta(current: number, previous: number): Delta | null {
  if (previous === 0) return null;

  const percent = ((current - previous) / previous) * 100;
  if (Math.abs(percent) < 1) return { percent: 0, direction: 'flat' };

  return {
    percent: Math.round(Math.abs(percent)),
    direction: percent > 0 ? 'up' : 'down',
  };
}

/** The sign lives in the arrow glyph, so the text carries only the magnitude. */
export function formatDelta(value: Delta): string {
  return value.direction === 'flat' ? 'no change' : `${value.percent}%`;
}

const DAY_MS = 86_400_000;

/**
 * Named once under the grid rather than repeated on every tile. Derived from the
 * span so a custom range describes itself without a case of its own.
 */
export function comparisonLabel(range: DateRange): string {
  const days = Math.max(1, Math.round((range.to - range.from) / DAY_MS));
  if (days === 365 || days === 366) return 'previous year';
  if (days === 1) return 'previous day';
  return `previous ${days} days`;
}
