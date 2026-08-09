import type { MascotState } from '@/lib/mascot-images';
import { isValidSet, TRACKING, trackingTypeOf, type TrackingType } from '@/lib/tracking-types';
import { formatDuration } from '@/lib/units';
import type { WorkoutExerciseRow, WorkoutSetRow } from '@/lib/workout-queries';

/** `0:03` under an hour, `1:02:11` over it — the same shape the header clock uses. */
export function formatElapsed(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
}

/** `00:58:53` — padded, so a column of averages stays aligned. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** `5h 53m`, for a total that runs to hours and doesn't care about seconds. */
export function formatHoursMinutes(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes % 60}m`;
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
