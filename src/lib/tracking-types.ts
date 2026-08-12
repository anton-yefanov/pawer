import {
  distanceUnitFor,
  formatDistance,
  formatDuration,
  formatWeight,
  type WeightUnit,
} from '@/lib/units';

/**
 * What a set of a given exercise actually measures. Everything that renders or
 * aggregates a set reads this rather than assuming weight × reps: the set row
 * builds its inputs from `fields`, the column headers from `headerLabel`, and
 * volume counts only the types where weight × reps means anything.
 *
 * Assisted and weighted bodyweight both store a positive magnitude in
 * `weightKg` — only the sign shown to the user differs.
 */
export type TrackingType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'weighted_bodyweight'
  | 'assisted_bodyweight'
  | 'duration'
  | 'distance_duration';

export type SetField = 'weight' | 'reps' | 'duration' | 'distance';

export type TrackedSet = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
};

type Config = {
  fields: readonly SetField[];
  /** Prefix on the weight header. Purely presentational. */
  weightSign: '' | '+' | '−';
  countsVolume: boolean;
};

export const TRACKING: Record<TrackingType, Config> = {
  weight_reps: { fields: ['weight', 'reps'], weightSign: '', countsVolume: true },
  bodyweight_reps: { fields: ['reps'], weightSign: '', countsVolume: false },
  weighted_bodyweight: { fields: ['weight', 'reps'], weightSign: '+', countsVolume: true },
  assisted_bodyweight: { fields: ['weight', 'reps'], weightSign: '−', countsVolume: false },
  duration: { fields: ['duration'], weightSign: '', countsVolume: false },
  distance_duration: { fields: ['distance', 'duration'], weightSign: '', countsVolume: false },
};

export const TRACKING_LABELS: Record<TrackingType, { title: string; examples: string }> = {
  weight_reps: { title: 'Weight, Reps', examples: 'Bench Press, Dumbbell Row, Cable Crossovers' },
  weighted_bodyweight: { title: 'Bodyweight + Weight, Reps', examples: 'Weighted Dips, Pull Up' },
  assisted_bodyweight: {
    title: 'Assisted Bodyweight, Reps',
    examples: 'Assisted Dips, Assisted Chin Up',
  },
  bodyweight_reps: { title: 'Reps', examples: 'Push Ups, Bodyweight Squat' },
  duration: { title: 'Time', examples: 'Front Plank, Wall Sits' },
  distance_duration: { title: 'Distance, Time', examples: 'Running, Rowing, Cycling' },
};

/** Order and grouping of the exercise-type picker. */
export const TRACKING_SECTIONS: { title: string; types: readonly TrackingType[] }[] = [
  { title: 'Strength', types: ['weight_reps'] },
  {
    title: 'Bodyweight',
    types: ['weighted_bodyweight', 'assisted_bodyweight', 'bodyweight_reps', 'duration'],
  },
  { title: 'Cardio', types: ['distance_duration'] },
];

/**
 * `exercises.tracking_type` is plain text, and a row written by an older build
 * has to degrade to something renderable rather than to no columns at all.
 */
export function trackingTypeOf(value: string | null | undefined): TrackingType {
  return value != null && value in TRACKING ? (value as TrackingType) : 'weight_reps';
}

export function headerLabel(field: SetField, type: TrackingType, unit: WeightUnit): string {
  switch (field) {
    case 'weight':
      return `${TRACKING[type].weightSign}${unit}`;
    case 'reps':
      return 'Reps';
    case 'duration':
      return 'Time';
    case 'distance':
      return distanceUnitFor(unit);
  }
}

/** The ghost text in the Previous column: `60 kg × 8`, `12 reps`, `2.5 km · 12:00`. */
export function formatPreviousSet(
  set: TrackedSet,
  type: TrackingType,
  unit: WeightUnit
): string {
  const reps = `${set.reps ?? 0} reps`;

  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
      if (set.weightKg == null) return reps;
      return `${TRACKING[type].weightSign}${formatWeight(set.weightKg, unit)} × ${set.reps ?? 0}`;
    case 'bodyweight_reps':
      return reps;
    case 'duration':
      return set.durationSeconds == null ? '—' : formatDuration(set.durationSeconds);
    case 'distance_duration': {
      const parts = [
        set.distanceM == null ? null : formatDistance(set.distanceM, distanceUnitFor(unit)),
        set.durationSeconds == null ? null : formatDuration(set.durationSeconds),
      ].filter((part) => part !== null);
      return parts.length === 0 ? '—' : parts.join(' · ');
    }
  }
}

/**
 * The fields that define the effort and are still empty. Weight is never
 * required — a blank weight column means bodyweight, not an unfinished set —
 * and cardio needs only one of its two.
 */
export function missingRequiredFields(set: TrackedSet, type: TrackingType): SetField[] {
  const hasReps = set.reps != null && set.reps > 0;
  const hasDuration = set.durationSeconds != null && set.durationSeconds > 0;
  const hasDistance = set.distanceM != null && set.distanceM > 0;

  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
    case 'bodyweight_reps':
      return hasReps ? [] : ['reps'];
    case 'duration':
      return hasDuration ? [] : ['duration'];
    case 'distance_duration':
      return hasDistance || hasDuration ? [] : ['distance', 'duration'];
  }
}

/** A set worth counting: the field that defines the effort carries a value. */
export function isValidSet(set: TrackedSet, type: TrackingType): boolean {
  return missingRequiredFields(set, type).length === 0;
}
