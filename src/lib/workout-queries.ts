import { and, asc, count, countDistinct, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, personalRecords, sets, workoutExercises, workouts } from '@/db/schema';

/**
 * Query *builders*. Nothing here is awaited — the objects are handed to
 * `useLiveQuery`, which subscribes and re-runs them on every write.
 */

export const VOLUME_TRACKING_TYPES = sql`${exercises.trackingType} IN ('weight_reps', 'weighted_bodyweight')`;

/**
 * Warm-ups are logged but counted only when the lifter asks for it — left out
 * they'd otherwise inflate volume and set counts. Every aggregate over sets is
 * gated on this and passes the Include Warmup in Stats preference down;
 * `isWorkSet` in src/lib/set-types.ts is the same rule for the JS side.
 *
 * Personal records are the one aggregate that never asks: they pass `false`.
 */
export function workSets(includeWarmup: boolean) {
  return includeWarmup ? sql`1` : sql`${sets.setType} <> 'warmup'`;
}

export function activeWorkoutQuery() {
  return db
    .select()
    .from(workouts)
    .where(and(isNull(workouts.finishedAt), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1);
}

/**
 * Awaited, not a builder — the finish reminder reads this once as the app goes
 * to background, outside React.
 *
 * `updatedAt` moves on every write to a workout, its exercises or its sets
 * (including the debounced keystroke writes), so the newest of the three *is*
 * the last time the user did anything. Nothing needs to track activity in JS.
 */
export async function activeWorkoutForReminder() {
  const workout = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      updatedAt: workouts.updatedAt,
    })
    .from(workouts)
    .where(and(isNull(workouts.finishedAt), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1)
    .get();
  if (!workout) return null;

  const activity = await db
    .select({
      exercisesAt: sql<number>`COALESCE(MAX(${workoutExercises.updatedAt}), 0)`,
      setsAt: sql<number>`COALESCE(MAX(${sets.updatedAt}), 0)`,
    })
    .from(workoutExercises)
    .leftJoin(sets, and(eq(sets.workoutExerciseId, workoutExercises.id), isNull(sets.deletedAt)))
    .where(and(eq(workoutExercises.workoutId, workout.id), isNull(workoutExercises.deletedAt)))
    .get();

  return {
    id: workout.id,
    name: workout.name,
    lastActivityAt: Math.max(
      workout.updatedAt,
      activity?.exercisesAt ?? 0,
      activity?.setsAt ?? 0
    ),
  };
}

/**
 * The history list, with its totals aggregated in SQL — a per-row `summarise()`
 * would mean two more queries per finished workout.
 *
 * `COUNT(DISTINCT)` is what keeps the set-row fan-out of the second join from
 * multiplying the exercise count.
 *
 * Volume is gated on the tracking type so an assisted pull-up's −23 kg doesn't
 * read as 23 kg of work; this must stay in step with `countsVolume` in
 * src/lib/tracking-types.ts, which the summary card uses on the same data.
 */
/**
 * Awaited, unlike everything else here — it answers "which workout was that,
 * their first or their fortieth", which only makes sense at the moment one is
 * finished and never needs to be live.
 */
export async function finishedWorkoutCount(): Promise<number> {
  const row = await db
    .select({ total: count() })
    .from(workouts)
    .where(and(isNotNull(workouts.finishedAt), isNull(workouts.deletedAt)))
    .get();
  return row?.total ?? 0;
}

export function finishedWorkoutsQuery(includeWarmup: boolean) {
  const work = workSets(includeWarmup);

  return db
    .select({
      id: workouts.id,
      name: workouts.name,
      startedAt: workouts.startedAt,
      finishedAt: workouts.finishedAt,
      exerciseCount: countDistinct(workoutExercises.id),
      completedSets: sql<number>`COALESCE(SUM(CASE WHEN ${sets.completed} = 1 AND ${work} THEN 1 ELSE 0 END), 0)`,
      volumeKg: sql<number>`COALESCE(SUM(CASE WHEN ${sets.completed} = 1 AND ${work} AND ${VOLUME_TRACKING_TYPES} THEN COALESCE(${sets.weightKg}, 0) * COALESCE(${sets.reps}, 0) ELSE 0 END), 0)`,
      // A scalar subquery, not a fourth join: joining records in would multiply
      // the set fan-out that COUNT(DISTINCT) above only just contains.
      prCount: sql<number>`(SELECT COUNT(*) FROM ${personalRecords} pr
        WHERE pr.workout_id = ${workouts.id} AND pr.deleted_at IS NULL)`,
    })
    .from(workouts)
    .leftJoin(
      workoutExercises,
      and(eq(workoutExercises.workoutId, workouts.id), isNull(workoutExercises.deletedAt))
    )
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .leftJoin(
      sets,
      and(eq(sets.workoutExerciseId, workoutExercises.id), isNull(sets.deletedAt))
    )
    .where(and(isNotNull(workouts.finishedAt), isNull(workouts.deletedAt)))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.finishedAt));
}

/**
 * The exercise lines under each row of the history list — one flat query for
 * every finished workout, sliced per workout in JS, rather than a query per row.
 *
 * The set count is a scalar subquery for the same reason `prCount` above is one:
 * joining sets in would fan the rows out. It counts only completed work sets, so
 * "3x Deadlift" means three sets that actually happened.
 */
export function finishedWorkoutExercisesQuery(includeWarmup: boolean) {
  return db
    .select({
      workoutId: workoutExercises.workoutId,
      position: workoutExercises.position,
      name: exercises.name,
      setCount: sql<number>`(SELECT COUNT(*) FROM ${sets}
        WHERE ${sets.workoutExerciseId} = ${workoutExercises.id}
          AND ${sets.deletedAt} IS NULL AND ${sets.completed} = 1 AND ${workSets(includeWarmup)})`,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(
      and(
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt)
      )
    )
    .orderBy(asc(workoutExercises.workoutId), asc(workoutExercises.position));
}

export function workoutQuery(workoutId: string) {
  return db.select().from(workouts).where(eq(workouts.id, workoutId)).limit(1);
}

export function workoutExercisesQuery(workoutId: string) {
  return db
    .select({
      id: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      position: workoutExercises.position,
      notes: workoutExercises.notes,
      restSeconds: workoutExercises.restSeconds,
      supersetId: workoutExercises.supersetId,
      name: exercises.name,
      sourceId: exercises.sourceId,
      trackingType: exercises.trackingType,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.position));
}

export function workoutSetsQuery(workoutId: string) {
  return db
    .select({
      id: sets.id,
      workoutExerciseId: sets.workoutExerciseId,
      position: sets.position,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceM: sets.distanceM,
      completed: sets.completed,
      setType: sets.setType,
      notes: sets.notes,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        isNull(sets.deletedAt),
        isNull(workoutExercises.deletedAt)
      )
    )
    .orderBy(asc(sets.position));
}

/**
 * Ghost values for the "Previous" column: every exercise's sets from the last
 * finished workout that actually logged it.
 *
 * The subquery is correlated on `exercise_id` so one pass covers every card in
 * the session — each exercise picks its own most recent workout, which a plain
 * `ORDER BY … LIMIT 1` can't express. Requiring a completed set inside the
 * subquery is deliberate: an abandoned session where the exercise was added but
 * never logged would otherwise mask the last real numbers.
 */
export function previousSetsQuery(currentWorkoutId: string | null) {
  // Null in the template editor, which has no session of its own to exclude.
  const excludeCurrent = currentWorkoutId == null ? undefined : ne(workouts.id, currentWorkoutId);
  const excludeInner = currentWorkoutId == null ? sql`` : sql`AND w2.id <> ${currentWorkoutId}`;

  return db
    .select({
      exerciseId: workoutExercises.exerciseId,
      position: sets.position,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceM: sets.distanceM,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(
        isNull(sets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        isNotNull(workouts.finishedAt),
        excludeCurrent,
        eq(sets.completed, true),
        sql`${workouts.finishedAt} = (
          SELECT MAX(w2.finished_at)
          FROM ${workouts} w2
          JOIN ${workoutExercises} we2 ON we2.workout_id = w2.id
          JOIN ${sets} s2 ON s2.workout_exercise_id = we2.id
          WHERE we2.exercise_id = ${workoutExercises.exerciseId}
            ${excludeInner}
            AND w2.finished_at IS NOT NULL
            AND w2.deleted_at IS NULL
            AND we2.deleted_at IS NULL
            AND s2.deleted_at IS NULL
            AND s2.completed = 1
        )`
      )
    )
    .orderBy(asc(workoutExercises.exerciseId), asc(sets.position));
}

export function workoutPersonalRecordsQuery(workoutId: string) {
  return db
    .select({
      id: personalRecords.id,
      exerciseId: personalRecords.exerciseId,
      kind: personalRecords.kind,
      value: personalRecords.value,
      setId: personalRecords.setId,
    })
    .from(personalRecords)
    .where(and(eq(personalRecords.workoutId, workoutId), isNull(personalRecords.deletedAt)));
}

export type HistoryRow = Awaited<ReturnType<typeof finishedWorkoutsQuery>>[number];
export type FinishedWorkoutExercise = Awaited<
  ReturnType<typeof finishedWorkoutExercisesQuery>
>[number];
export type WorkoutPrRow = Awaited<ReturnType<typeof workoutPersonalRecordsQuery>>[number];
export type WorkoutExerciseRow = Awaited<ReturnType<typeof workoutExercisesQuery>>[number];
export type WorkoutSetRow = Awaited<ReturnType<typeof workoutSetsQuery>>[number];
export type PreviousSet = Awaited<ReturnType<typeof previousSetsQuery>>[number];

export function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}
