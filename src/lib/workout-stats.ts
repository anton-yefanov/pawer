import type { MascotState } from '@/lib/mascot-images';
import { isWorkSet } from '@/lib/set-types';
import { isValidSet, TRACKING, trackingTypeOf, type TrackingType } from '@/lib/tracking-types';
import { formatDuration } from '@/lib/units';
import type { WorkoutExerciseRow, WorkoutSetRow } from '@/lib/workout-queries';

/** `0:03` under an hour, `1:02:11` over it — the same shape the header clock uses. */
export function formatElapsed(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
}

/** `5h 53m`, `160d 1h`, for a total that runs long and doesn't care about seconds. */
export function formatHoursMinutes(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes % 60}m`;
}

/** "August 2026" — the history list's section header. */
export function formatMonth(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Carries the year so two Augusts a year apart never land in one section. */
export function monthKey(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getFullYear()}-${date.getMonth()}`;
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

/**
 * Where the lifter is right now: the first exercise still holding a fillable,
 * uncompleted set, and that set's place among its exercise's work sets.
 *
 * There is no "current exercise" in the schema — the logger renders every card
 * at once — so this is the nearest honest answer, and it's the same rule
 * `hasIncompleteValidSets` uses to decide a session still has work left.
 */
export function currentPosition(
  workoutExercises: readonly WorkoutExerciseRow[],
  sets: readonly WorkoutSetRow[],
  tracking: TrackingByExercise
): { exerciseName: string; setIndex: number; setCount: number } | null {
  for (const exercise of workoutExercises) {
    const own = sets.filter((set) => set.workoutExerciseId === exercise.id && isWorkSet(set));
    const index = own.findIndex((set) => !set.completed && isValidSet(set, typeOf(set, tracking)));
    if (index === -1) continue;
    return { exerciseName: exercise.name, setIndex: index + 1, setCount: own.length };
  }
  return null;
}

/** Only the types where weight × reps is work the user actually moved. */
export function totalVolumeKg(
  sets: readonly WorkoutSetRow[],
  tracking: TrackingByExercise
): number {
  return sets.reduce((sum, set) => {
    if (!set.completed || !isWorkSet(set) || !TRACKING[typeOf(set, tracking)].countsVolume)
      return sum;
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
    completedSets: sets.filter((set) => set.completed && isWorkSet(set)).length,
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
