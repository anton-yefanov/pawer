import { PERIODS, rangeFor, type DateRange, type PeriodId } from '@/lib/analytics-period';

export const EXERCISE_PERIODS = PERIODS;

export type ExercisePeriodId = PeriodId;

export const DEFAULT_EXERCISE_PERIOD: ExercisePeriodId = 'all';

export function exerciseRange(id: ExercisePeriodId): DateRange {
  return rangeFor(id);
}
