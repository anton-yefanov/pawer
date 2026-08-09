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

/** A set worth counting: the field that defines the effort carries a value. */
export function isValidSet(set: TrackedSet, type: TrackingType): boolean {
  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
    case 'bodyweight_reps':
      return set.reps != null && set.reps > 0;
    case 'duration':
      return set.durationSeconds != null && set.durationSeconds > 0;
    case 'distance_duration':
      return (
        (set.durationSeconds != null && set.durationSeconds > 0) ||
        (set.distanceM != null && set.distanceM > 0)
      );
  }
}
