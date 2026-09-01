import { and, asc, countDistinct, desc, eq, gte, isNotNull, isNull, lt, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, personalRecords, sets, workoutExercises, workouts } from '@/db/schema';
import type { DateRange } from '@/lib/analytics-period';
import { VOLUME_TRACKING_TYPES, workSets } from '@/lib/workout-queries';

/**
 * Query *builders* for one exercise's own history, handed to `useLiveQuery` like
 * the ones in src/lib/workout-queries.ts. The analytics queries next door are
 * range-scoped and aggregate across every exercise; these are the other axis.
 *
 * All of them read finished workouts only. A session in progress would otherwise
 * land in the chart as a half-height bar that grows while the user logs into it.
 */

function loggedSets(exerciseId: string, includeWarmup: boolean, range?: DateRange) {
  return and(
    eq(workoutExercises.exerciseId, exerciseId),
    eq(sets.completed, true),
    workSets(includeWarmup),
    isNull(sets.deletedAt),
    isNull(workoutExercises.deletedAt),
    isNull(workouts.deletedAt),
    isNotNull(workouts.finishedAt),
    // Ranged on `startedAt` like the analytics queries, so a session begun
    // before midnight and finished after it lands in the day the user did it.
    range && gte(workouts.startedAt, range.from),
    range && lt(workouts.startedAt, range.to)
  );
}

/**
 * The standing record per kind. `personal_records` is append-only, so the record
 * is `MAX(value)` — and `achievedAt` has to come from the row holding that max
 * rather than from `MAX(achieved_at)`, which would date a record by whenever it
 * was last tied.
 */
export function exerciseRecordsQuery(exerciseId: string) {
  return db
    .select({
      kind: personalRecords.kind,
      value: sql<number>`MAX(${personalRecords.value})`,
      achievedAt: sql<number>`${personalRecords.achievedAt}`,
    })
    .from(personalRecords)
    .where(and(eq(personalRecords.exerciseId, exerciseId), isNull(personalRecords.deletedAt)))
    .groupBy(personalRecords.kind);
}

export type ExerciseRecordRow = Awaited<ReturnType<typeof exerciseRecordsQuery>>[number];

export function exerciseTotalsQuery(
  exerciseId: string,
  range: DateRange,
  includeWarmup: boolean
) {
  return db
    .select({
      sessions: countDistinct(workouts.id),
      completedSets: sql<number>`COUNT(${sets.id})`,
      reps: sql<number>`COALESCE(SUM(COALESCE(${sets.reps}, 0)), 0)`,
      volumeKg: sql<number>`COALESCE(SUM(CASE WHEN ${VOLUME_TRACKING_TYPES} THEN COALESCE(${sets.weightKg}, 0) * COALESCE(${sets.reps}, 0) ELSE 0 END), 0)`,
      distanceM: sql<number>`COALESCE(SUM(COALESCE(${sets.distanceM}, 0)), 0)`,
      durationSeconds: sql<number>`COALESCE(SUM(COALESCE(${sets.durationSeconds}, 0)), 0)`,
      lastAt: sql<number | null>`MAX(${workouts.startedAt})`,
      firstAt: sql<number | null>`MIN(${workouts.startedAt})`,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(loggedSets(exerciseId, includeWarmup, range));
}

export type ExerciseTotals = Awaited<ReturnType<typeof exerciseTotalsQuery>>[number];

/**
 * One row per finished workout that logged this exercise, oldest first — the
 * chart's bars, and the session count the stat row reads.
 *
 * `reps / 30.0` and not `reps / 30`: SQLite would do integer division and hand
 * back the bare weight for every set under 30 reps. This is `epley1rm` from
 * src/lib/personal-records.ts, and the two have to stay the same formula.
 */
export function exerciseSessionsQuery(exerciseId: string, includeWarmup: boolean) {
  return db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      name: workouts.name,
      setCount: sql<number>`COUNT(${sets.id})`,
      topWeightKg: sql<number>`COALESCE(MAX(${sets.weightKg}), 0)`,
      bestE1rmKg: sql<number>`COALESCE(MAX(CASE WHEN COALESCE(${sets.reps}, 0) > 0 THEN COALESCE(${sets.weightKg}, 0) * (1 + ${sets.reps} / 30.0) ELSE 0 END), 0)`,
      bestReps: sql<number>`COALESCE(MAX(COALESCE(${sets.reps}, 0)), 0)`,
      volumeKg: sql<number>`COALESCE(SUM(COALESCE(${sets.weightKg}, 0) * COALESCE(${sets.reps}, 0)), 0)`,
      reps: sql<number>`COALESCE(SUM(COALESCE(${sets.reps}, 0)), 0)`,
      distanceM: sql<number>`COALESCE(SUM(COALESCE(${sets.distanceM}, 0)), 0)`,
      durationSeconds: sql<number>`COALESCE(SUM(COALESCE(${sets.durationSeconds}, 0)), 0)`,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(loggedSets(exerciseId, includeWarmup))
    .groupBy(workouts.id)
    .orderBy(asc(workouts.startedAt));
}

export type ExerciseSession = Awaited<ReturnType<typeof exerciseSessionsQuery>>[number];

/**
 * The individual sets behind the most recent sessions, so a history row can
 * print what was actually logged rather than a count. Warm-ups are kept — the
 * list is a record of the session, not an aggregate — and carry their `setType`
 * so `setLabels` can mark them.
 */
export function exerciseSetsQuery(exerciseId: string, sessions: number) {
  return db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      position: sets.position,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceM: sets.distanceM,
      setType: sets.setType,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        eq(workoutExercises.exerciseId, exerciseId),
        eq(sets.completed, true),
        isNull(sets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt),
        sql`${workouts.id} IN (
          SELECT w2.id FROM ${workouts} w2
          JOIN ${workoutExercises} we2 ON we2.workout_id = w2.id
          JOIN ${sets} s2 ON s2.workout_exercise_id = we2.id
          WHERE we2.exercise_id = ${exerciseId}
            AND w2.finished_at IS NOT NULL
            AND w2.deleted_at IS NULL
            AND we2.deleted_at IS NULL
            AND s2.deleted_at IS NULL
            AND s2.completed = 1
          GROUP BY w2.id
          ORDER BY w2.started_at DESC
          LIMIT ${sessions}
        )`
      )
    )
    .orderBy(desc(workouts.startedAt), asc(sets.position));
}

export type ExerciseSetRow = Awaited<ReturnType<typeof exerciseSetsQuery>>[number];

/** Which sessions earned a record here, for the trophy on a history row. */
export function exercisePrWorkoutsQuery(exerciseId: string) {
  return db
    .select({
      workoutId: personalRecords.workoutId,
      records: sql<number>`COUNT(*)`,
    })
    .from(personalRecords)
    .where(and(eq(personalRecords.exerciseId, exerciseId), isNull(personalRecords.deletedAt)))
    .groupBy(personalRecords.workoutId);
}
