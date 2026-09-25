import { t } from '@/i18n';

export type PeriodId = 'd7' | 'd30' | 'd90' | 'd180' | 'y1' | 'all';

/** Epoch ms, half-open `[from, to)`. */
export type DateRange = { from: number; to: number };

export const PERIODS = (['d7', 'd30', 'd90', 'd180', 'y1', 'all'] as const satisfies readonly PeriodId[]).map(
  (id) => ({
    id,
    get label() {
      return t(`analytics:period.${id}.label`);
    },
    get short() {
      return t(`analytics:period.${id}.short`);
    },
  })
);

export const DEFAULT_PERIOD: PeriodId = 'd7';

/** The free tier sees the windows up to a quarter; anything wider is Pro. */
export const FREE_PERIODS: readonly PeriodId[] = ['d7', 'd30', 'd90'];

export function isPeriodLocked(id: PeriodId, isPro: boolean): boolean {
  return !isPro && !FREE_PERIODS.includes(id);
}

export function periodLabel(id: PeriodId): string {
  return PERIODS.find((period) => period.id === id)?.label ?? '';
}

export function shortPeriodLabel(id: PeriodId): string {
  return PERIODS.find((period) => period.id === id)?.short ?? '';
}

export function startOfDay(date: Date): number {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

function daysAgo(days: number): number {
  const day = new Date();
  // `days - 1`, because "last 7 days" counts today as one of them.
  day.setDate(day.getDate() - (days - 1));
  return startOfDay(day);
}

function endOfDay(date: Date): number {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() + 1);
  return day.getTime();
}

/**
 * Ranges snap to local midnight so a preset never slices today in half — a
 * workout finished this morning belongs to "last 7 days" whatever the clock
 * says when the screen opens.
 */
export function rangeFor(id: PeriodId): DateRange {
  const tomorrow = endOfDay(new Date());

  switch (id) {
    case 'd7':
      return { from: daysAgo(7), to: tomorrow };
    case 'd30':
      return { from: daysAgo(30), to: tomorrow };
    case 'd90':
      return { from: daysAgo(90), to: tomorrow };
    case 'd180':
      return { from: daysAgo(180), to: tomorrow };
    case 'y1': {
      const year = new Date();
      year.setFullYear(year.getFullYear() - 1);
      year.setDate(year.getDate() + 1);
      return { from: startOfDay(year), to: tomorrow };
    }
    case 'all':
      return { from: 0, to: tomorrow };
  }
}
