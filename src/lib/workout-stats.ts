import type { MascotState } from '@/lib/mascot-images';
import { isValidSet, TRACKING, trackingTypeOf, type TrackingType } from '@/lib/tracking-types';
import { formatDuration } from '@/lib/units';
import type { WorkoutExerciseRow, WorkoutSetRow } from '@/lib/workout-queries';

/** `0:03` under an hour, `1:02:11` over it — the same shape the header clock uses. */
export function formatElapsed(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
}

/** "Sat, 8 Aug at 17:53" */
export function formatStartTime(epochMs: number): string {
  const date = new Date(epochMs);
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} at ${time}`;
}

/**
 * Which tracking type each set belongs to, keyed by its workout exercise —
 * every aggregate below needs it, and the set rows themselves don't carry it.
 */
export type TrackingByExercise = ReadonlyMap<string, TrackingType>;

function typeOf(set: WorkoutSetRow, tracking: TrackingByExercise): TrackingType {
  return tracking.get(set.workoutExerciseId) ?? 'weight_reps';
}

export function trackingByExercise(
  workoutExercises: readonly WorkoutExerciseRow[]
): TrackingByExercise {
  return new Map(workoutExercises.map((row) => [row.id, trackingTypeOf(row.trackingType)]));
}

export function hasIncompleteValidSets(
  sets: readonly WorkoutSetRow[],
  tracking: TrackingByExercise
): boolean {
  return sets.some((set) => !set.completed && isValidSet(set, typeOf(set, tracking)));
}

/** Only the types where weight × reps is work the user actually moved. */
export function totalVolumeKg(
  sets: readonly WorkoutSetRow[],
  tracking: TrackingByExercise
): number {
  return sets.reduce((sum, set) => {
    if (!set.completed || !TRACKING[typeOf(set, tracking)].countsVolume) return sum;
    return sum + (set.weightKg ?? 0) * (set.reps ?? 0);
  }, 0);
}

export type WorkoutSummary = {
  durationMs: number;
  volumeKg: number;
  completedSets: number;
  exerciseCount: number;
};

export function summarise(
  workout: { startedAt: number; finishedAt: number | null },
  workoutExercises: readonly WorkoutExerciseRow[],
  sets: readonly WorkoutSetRow[]
): WorkoutSummary {
  return {
    durationMs: (workout.finishedAt ?? Date.now()) - workout.startedAt,
    volumeKg: totalVolumeKg(sets, trackingByExercise(workoutExercises)),
    completedSets: sets.filter((set) => set.completed).length,
    exerciseCount: workoutExercises.length,
  };
}

export function mascotStateFor({
  finished,
  resting,
  hasProgress,
}: {
  finished: boolean;
  resting: boolean;
  hasProgress: boolean;
}): MascotState {
  if (finished) return 'celebrating';
  if (resting) return 'resting';
  return hasProgress ? 'encouraging' : 'idle';
}
