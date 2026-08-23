import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, personalRecords, sets, workoutExercises, workouts } from '@/db/schema';
import type { DateRange } from '@/lib/analytics-period';
import { VOLUME_TRACKING_TYPES, WORK_SETS } from '@/lib/workout-queries';

/**
 * Query *builders*, handed to `useLiveQuery` like the ones in
 * src/lib/workout-queries.ts.
 *
 * Two queries rather than one: durations live on the workout row, and summing
 * them across the exercise/set joins would multiply every workout's duration by
 * its set count.
 */

/**
 * Ranged on `startedAt`, not `finishedAt`: the history list dates a workout by
 * when it started (`formatStartTime(workout.startedAt)`), so a session begun in
 * April and finished in August has to land in April here too. `finishedAt` is
 * still what makes a workout count at all.
 */
function inRange(range: DateRange) {
  return and(
    isNotNull(workouts.finishedAt),
    isNull(workouts.deletedAt),
    gte(workouts.startedAt, range.from),
    lt(workouts.startedAt, range.to)
  );
}

export function workoutTotalsQuery(range: DateRange) {
  return db
    .select({
      // Echoed back so a caller can tell this result apart from the last
      // range's: `useLiveQuery` keeps the previous rows until the new query
      // settles, and a comparison drawn from those is briefly wrong.
      from: sql<number>`${range.from}`,
      workouts: count(),
      // Clamped per workout, not on the total: a start time edited past its
      // finish would otherwise subtract from every real session in the range.
      // The history list clamps the same way (`formatDuration`).
      durationMs: sql<number>`COALESCE(SUM(MAX(${workouts.finishedAt} - ${workouts.startedAt}, 0)), 0)`,
    })
    .from(workouts)
    .where(inRange(range));
}

/**
 * When the user's history begins. A comparison is only fair against a window
 * their training already covered — a first workout part-way through the
 * previous period turns a percentage into noise (a 180-day view can otherwise
 * report a five-figure gain against the one session that happened to precede
 * it).
 */
export function firstWorkoutQuery() {
  return db
    .select({ startedAt: sql<number | null>`MIN(${workouts.startedAt})` })
    .from(workouts)
    .where(and(isNotNull(workouts.finishedAt), isNull(workouts.deletedAt)));
}

/**
 * Records are ranged on the *workout's* `startedAt`, not on their own
 * `achievedAt`: `achievedAt` is stamped when the workout is finished, so a
 * session begun before midnight and finished after it would land in a different
 * bucket than every other number on the screen.
 */
function prInRange(range: DateRange) {
  return and(inRange(range), isNull(personalRecords.deletedAt));
}

export function prTotalsQuery(range: DateRange) {
  return db
    .select({
      from: sql<number>`${range.from}`,
      records: count(),
    })
    .from(personalRecords)
    .innerJoin(workouts, eq(workouts.id, personalRecords.workoutId))
    .where(prInRange(range));
}

export function periodRecordsQuery(range: DateRange) {
  return db
    .select({
      id: personalRecords.id,
      kind: personalRecords.kind,
      value: personalRecords.value,
      achievedAt: personalRecords.achievedAt,
      exerciseName: exercises.name,
      trackingType: exercises.trackingType,
    })
    .from(personalRecords)
    .innerJoin(workouts, eq(workouts.id, personalRecords.workoutId))
    .innerJoin(exercises, eq(exercises.id, personalRecords.exerciseId))
    .where(prInRange(range))
    .orderBy(desc(personalRecords.achievedAt));
}

export type PeriodRecordRow = Awaited<ReturnType<typeof periodRecordsQuery>>[number];

export function setTotalsQuery(range: DateRange) {
  const completed = sql`${sets.completed} = 1 AND ${WORK_SETS}`;

  return db
    .select({
      exerciseEntries: countDistinct(workoutExercises.id),
      completedSets: sql<number>`COALESCE(SUM(CASE WHEN ${completed} THEN 1 ELSE 0 END), 0)`,
      reps: sql<number>`COALESCE(SUM(CASE WHEN ${completed} THEN COALESCE(${sets.reps}, 0) ELSE 0 END), 0)`,
      volumeKg: sql<number>`COALESCE(SUM(CASE WHEN ${completed} AND ${VOLUME_TRACKING_TYPES} THEN COALESCE(${sets.weightKg}, 0) * COALESCE(${sets.reps}, 0) ELSE 0 END), 0)`,
      distanceM: sql<number>`COALESCE(SUM(CASE WHEN ${completed} THEN COALESCE(${sets.distanceM}, 0) ELSE 0 END), 0)`,
    })
    .from(workouts)
    .leftJoin(
      workoutExercises,
      and(eq(workoutExercises.workoutId, workouts.id), isNull(workoutExercises.deletedAt))
    )
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .leftJoin(sets, and(eq(sets.workoutExerciseId, workoutExercises.id), isNull(sets.deletedAt)))
    .where(inRange(range));
}

export type MetricRow = {
  startedAt: number;
  durationMs: number;
  volumeKg: number;
  completedSets: number;
  reps: number;
  distanceM: number;
};

/**
 * One row per finished workout, carrying every chartable metric — the four-table
 * join is the expensive part, so every chart on the screen reads this one query
 * and `buildSeries` picks the column.
 *
 * Duration is safe here where it isn't in `workoutTotalsQuery`: grouping by
 * workout id makes it constant within the group, so it needs no aggregate and
 * the set fan-out can't multiply it.
 *
 * Bucketing happens in JS, not SQL: `rangeFor` snaps to local midnight, while
 * SQLite's `date()` is UTC and its `'localtime'` modifier would quietly
 * disagree with the range bounds.
 */
export function metricSeriesQuery(range: DateRange) {
  const completed = sql`${sets.completed} = 1 AND ${WORK_SETS}`;

  return db
    .select({
      startedAt: workouts.startedAt,
      durationMs: sql<number>`MAX(${workouts.finishedAt} - ${workouts.startedAt}, 0)`,
      volumeKg: sql<number>`COALESCE(SUM(CASE WHEN ${completed} AND ${VOLUME_TRACKING_TYPES} THEN COALESCE(${sets.weightKg}, 0) * COALESCE(${sets.reps}, 0) ELSE 0 END), 0)`,
      completedSets: sql<number>`COALESCE(SUM(CASE WHEN ${completed} THEN 1 ELSE 0 END), 0)`,
      reps: sql<number>`COALESCE(SUM(CASE WHEN ${completed} THEN COALESCE(${sets.reps}, 0) ELSE 0 END), 0)`,
      distanceM: sql<number>`COALESCE(SUM(CASE WHEN ${completed} THEN COALESCE(${sets.distanceM}, 0) ELSE 0 END), 0)`,
    })
    .from(workouts)
    .leftJoin(
      workoutExercises,
      and(eq(workoutExercises.workoutId, workouts.id), isNull(workoutExercises.deletedAt))
    )
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .leftJoin(sets, and(eq(sets.workoutExerciseId, workoutExercises.id), isNull(sets.deletedAt)))
    .where(inRange(range))
    .groupBy(workouts.id)
    .orderBy(asc(workouts.startedAt));
}

export type AnalyticsTotals = {
  workouts: number;
  exerciseEntries: number;
  completedSets: number;
  reps: number;
  durationMs: number;
  avgDurationMs: number;
  volumeKg: number;
  avgVolumeKg: number;
  distanceM: number;
  records: number;
};

export function combineTotals(
  workoutRow: { workouts: number; durationMs: number } | undefined,
  setRow:
    | {
        exerciseEntries: number;
        completedSets: number;
        reps: number;
        volumeKg: number;
        distanceM: number;
      }
    | undefined,
  prRow?: { records: number }
): AnalyticsTotals {
  const workoutCount = workoutRow?.workouts ?? 0;
  const durationMs = workoutRow?.durationMs ?? 0;
  const volumeKg = setRow?.volumeKg ?? 0;

  return {
    workouts: workoutCount,
    exerciseEntries: setRow?.exerciseEntries ?? 0,
    completedSets: setRow?.completedSets ?? 0,
    reps: setRow?.reps ?? 0,
    durationMs,
    avgDurationMs: workoutCount === 0 ? 0 : durationMs / workoutCount,
    volumeKg,
    avgVolumeKg: workoutCount === 0 ? 0 : volumeKg / workoutCount,
    distanceM: setRow?.distanceM ?? 0,
    records: prRow?.records ?? 0,
  };
}
