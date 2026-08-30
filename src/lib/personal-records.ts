import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { db, type Executor } from '@/db/client';
import { newId } from '@/db/id';
import { exercises, personalRecords, sets, workoutExercises } from '@/db/schema';
import { trackingTypeOf, type TrackedSet, type TrackingType } from '@/lib/tracking-types';
import { formatTonnage, formatWeight, type WeightUnit } from '@/lib/units';
import { WORK_SETS } from '@/lib/workout-queries';

export const PR_KINDS = ['heaviest_weight', 'best_1rm', 'best_volume', 'most_reps'] as const;
export type PrKind = (typeof PR_KINDS)[number];

export const PR_LABELS: Record<PrKind, string> = {
  heaviest_weight: 'Weight',
  best_1rm: 'e1RM',
  best_volume: 'Volume',
  most_reps: 'Reps',
};

export function isPrKind(value: string): value is PrKind {
  return (PR_KINDS as readonly string[]).includes(value);
}

/** What a record's bare `value` means, which only its kind knows. */
export function formatPrValue(kind: PrKind, value: number, unit: WeightUnit): string {
  switch (kind) {
    case 'heaviest_weight':
    case 'best_1rm':
      return formatWeight(value, unit);
    case 'best_volume':
      return formatTonnage(value, unit);
    case 'most_reps': {
      const reps = Math.round(value);
      return `${reps} ${reps === 1 ? 'rep' : 'reps'}`;
    }
  }
}

/** Epley. Wrong past ~10 reps like every other formula, but it is the one lifters recognise. */
export function epley1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/**
 * Which records a single set is eligible for, and at what value. The only place
 * that maps a tracking type to record kinds, the way `TRACKING` is the only
 * place that maps one to columns.
 *
 * Assisted bodyweight earns nothing: less assistance is a better set, so a
 * larger `weightKg` is progress in reverse and none of the four kinds compare.
 * Duration and distance have no kind that means "longest" or "farthest" yet.
 */
export function candidateValues(
  set: TrackedSet,
  type: TrackingType
): Partial<Record<PrKind, number>> {
  const reps = set.reps ?? 0;
  if (reps <= 0) return {};

  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight': {
      const weightKg = set.weightKg ?? 0;
      if (weightKg <= 0) return {};
      return {
        heaviest_weight: weightKg,
        best_1rm: epley1rm(weightKg, reps),
        best_volume: weightKg * reps,
      };
    }
    case 'bodyweight_reps':
      return { most_reps: reps };
    case 'assisted_bodyweight':
    case 'duration':
    case 'distance_duration':
      return {};
  }
}

type Candidate = { exerciseId: string; kind: PrKind; value: number; setId: string };

/**
 * Writes one row per record the workout just set. Runs after `finishWorkout`
 * has purged unfinished sets, so only the sets the user actually logged count.
 *
 * Rows for this workout are cleared first: the confirm-finish path completes
 * unfinished sets and then finishes again, and a second pass must replace its
 * own rows rather than double them.
 */
export async function recordPersonalRecords(workoutId: string, exec: Executor = db): Promise<void> {
  const now = Date.now();

  await exec
    .update(personalRecords)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(personalRecords.workoutId, workoutId), isNull(personalRecords.deletedAt)));

  const rows = await exec
    .select({
      setId: sets.id,
      exerciseId: workoutExercises.exerciseId,
      trackingType: exercises.trackingType,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceM: sets.distanceM,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        eq(sets.completed, true),
        WORK_SETS,
        isNull(sets.deletedAt),
        isNull(workoutExercises.deletedAt)
      )
    );

  const best = new Map<string, Candidate>();
  for (const row of rows) {
    const values = candidateValues(row, trackingTypeOf(row.trackingType));
    for (const [kind, value] of Object.entries(values) as [PrKind, number][]) {
      const key = `${row.exerciseId}:${kind}`;
      const current = best.get(key);
      if (!current || value > current.value) {
        best.set(key, { exerciseId: row.exerciseId, kind, value, setId: row.setId });
      }
    }
  }
  if (best.size === 0) return;

  const standing = await exec
    .select({
      exerciseId: personalRecords.exerciseId,
      kind: personalRecords.kind,
      value: sql<number>`MAX(${personalRecords.value})`,
    })
    .from(personalRecords)
    .where(
      and(
        inArray(personalRecords.exerciseId, [...new Set(rows.map((row) => row.exerciseId))]),
        ne(personalRecords.workoutId, workoutId),
        isNull(personalRecords.deletedAt)
      )
    )
    .groupBy(personalRecords.exerciseId, personalRecords.kind);

  const previous = new Map(standing.map((row) => [`${row.exerciseId}:${row.kind}`, row.value]));

  const earned = [...best].filter(([key, candidate]) => {
    const record = previous.get(key);
    return record == null || candidate.value > record;
  });
  if (earned.length === 0) return;

  await exec.insert(personalRecords).values(
    earned.map(([, candidate]) => ({
      id: newId(),
      exerciseId: candidate.exerciseId,
      workoutId,
      kind: candidate.kind,
      value: candidate.value,
      setId: candidate.setId,
      achievedAt: now,
      createdAt: now,
      updatedAt: now,
    }))
  );
}
