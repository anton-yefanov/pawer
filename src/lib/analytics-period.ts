export type PeriodId = 'd7' | 'd30' | 'd90' | 'd180' | 'y1' | 'all' | 'custom';

/** Epoch ms, half-open `[from, to)`. */
export type DateRange = { from: number; to: number };

/** `label` reads on its own (chart captions); `short` only has to fit a chip. */
export const PERIODS: readonly {
  id: PeriodId;
  label: string;
  short: string;
}[] = [
  { id: 'd7', label: 'Last 7 days', short: '7D' },
  { id: 'd30', label: 'Last 30 days', short: '30D' },
  { id: 'd90', label: 'Last 90 days', short: '90D' },
  { id: 'd180', label: 'Last 180 days', short: '180D' },
  { id: 'y1', label: 'Last year', short: '1Y' },
  { id: 'all', label: 'All time', short: 'All' },
  { id: 'custom', label: 'Custom', short: 'Custom' },
];

export const DEFAULT_PERIOD: PeriodId = 'd30';

export function periodLabel(id: PeriodId): string {
  return PERIODS.find((period) => period.id === id)?.label ?? '';
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
export function rangeFor(id: PeriodId, custom?: { from: Date; to: Date }): DateRange {
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
    case 'custom': {
      if (!custom) return { from: 0, to: tomorrow };
      const reversed = custom.from > custom.to;
      const first = reversed ? custom.to : custom.from;
      const last = reversed ? custom.from : custom.to;
      return { from: startOfDay(first), to: endOfDay(last) };
    }
  }
}
