import { t } from '@/i18n';
import type { ExerciseSession } from '@/lib/exercise-history-queries';
import { TRACKING, type TrackingType } from '@/lib/tracking-types';
import {
  distanceUnitFor,
  formatDistance,
  formatDuration,
  formatTonnage,
  formatWeight,
  type WeightUnit,
} from '@/lib/units';

/**
 * What a tracking type plots on the exercise sheet, in the same spirit as
 * `TRACKING` for columns and `candidateValues` for record kinds: the only place
 * that switches on the type, so a chart never assumes weight × reps.
 *
 * The first metric is the one the chart opens on.
 */
export type ExerciseMetric = {
  id: string;
  readonly title: string;
  readonly short: string;
  pick: (session: ExerciseSession) => number;
  format: (value: number, unit: WeightUnit) => string;
};

const e1rm: ExerciseMetric = {
  id: 'e1rm',
  get title() {
    return t('exercises:metric.e1rm.title');
  },
  get short() {
    return t('exercises:metric.e1rm.short');
  },
  pick: (session) => session.bestE1rmKg,
  format: (value, unit) => formatWeight(value, unit),
};

const topWeight: ExerciseMetric = {
  id: 'top_weight',
  get title() {
    return t('exercises:metric.top_weight.title');
  },
  get short() {
    return t('exercises:metric.top_weight.short');
  },
  pick: (session) => session.topWeightKg,
  format: (value, unit) => formatWeight(value, unit),
};

const volume: ExerciseMetric = {
  id: 'volume',
  get title() {
    return t('exercises:metric.volume.title');
  },
  get short() {
    return t('exercises:metric.volume.short');
  },
  pick: (session) => session.volumeKg,
  format: (value, unit) => formatTonnage(value, unit),
};

const bestReps: ExerciseMetric = {
  id: 'best_reps',
  get title() {
    return t('exercises:metric.best_reps.title');
  },
  get short() {
    return t('exercises:metric.best_reps.short');
  },
  pick: (session) => session.bestReps,
  format: (value) => t('workout:repsCount', { count: Math.round(value) }),
};

const totalReps: ExerciseMetric = {
  id: 'reps',
  get title() {
    return t('exercises:metric.reps.title');
  },
  get short() {
    return t('exercises:metric.reps.short');
  },
  pick: (session) => session.reps,
  format: (value) => t('workout:repsCount', { count: Math.round(value) }),
};

const distance: ExerciseMetric = {
  id: 'distance',
  get title() {
    return t('exercises:metric.distance.title');
  },
  get short() {
    return t('exercises:metric.distance.short');
  },
  pick: (session) => session.distanceM,
  format: (value, unit) => formatDistance(value, distanceUnitFor(unit)),
};

const duration: ExerciseMetric = {
  id: 'duration',
  get title() {
    return t('exercises:metric.duration.title');
  },
  get short() {
    return t('exercises:metric.duration.short');
  },
  pick: (session) => session.durationSeconds,
  format: (value) => formatDuration(Math.round(value)),
};

/**
 * Assisted bodyweight charts reps and never load. A *smaller* `weightKg` is the
 * better set there, so a taller bar would read as progress made backwards —
 * the same reason `candidateValues` refuses to score it.
 */
const METRICS: Record<TrackingType, readonly ExerciseMetric[]> = {
  weight_reps: [e1rm, topWeight, volume],
  weighted_bodyweight: [e1rm, topWeight, volume],
  assisted_bodyweight: [bestReps, totalReps],
  bodyweight_reps: [bestReps, totalReps],
  duration: [duration],
  weight_duration: [topWeight, duration],
  distance_duration: [distance, duration],
};

export function metricsFor(type: TrackingType): readonly ExerciseMetric[] {
  return METRICS[type];
}

/** The lifetime totals worth showing beside the session count, per type. */
export function totalsFor(
  type: TrackingType
): readonly ('volume' | 'reps' | 'distance' | 'duration')[] {
  if (TRACKING[type].countsVolume) return ['volume'];
  if (type === 'distance_duration') return ['distance', 'duration'];
  if (type === 'duration' || type === 'weight_duration') return ['duration'];
  return ['reps'];
}

/**
 * Whether this type can take a record at all. Assisted, duration and distance
 * earn none — `candidateValues` returns nothing for them — so a "no records
 * yet" line there would promise something that never arrives.
 */
export function earnsRecords(type: TrackingType): boolean {
  return type === 'weight_reps' || type === 'weighted_bodyweight' || type === 'bodyweight_reps';
}
