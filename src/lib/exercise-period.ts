import { PERIODS, rangeFor, type DateRange, type PeriodId } from '@/lib/analytics-period';

/**
 * The exercise sheet's periods: the Analytics tab's presets without `custom`,
 * which needs two date pickers and has nowhere to put them inside a sheet.
 */
export const EXERCISE_PERIODS = PERIODS.filter((period) => period.id !== 'custom');

export type ExercisePeriodId = Exclude<PeriodId, 'custom'>;

export const DEFAULT_EXERCISE_PERIOD: ExercisePeriodId = 'all';

export function exerciseRange(id: ExercisePeriodId): DateRange {
  return rangeFor(id);
}
