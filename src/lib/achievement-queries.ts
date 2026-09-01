import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts } from '@/db/schema';
import { workSets } from '@/lib/workout-queries';

/**
 * One row per exercise per finished session, which is everything the
 * achievement ladders need: a set-level best for the metrics that describe a
 * single effort, and a session total for the two that describe cardio.
 *
 * Custom exercises are excluded — their ladders would have no metadata to scale
 * from, and a user could author a milestone for themselves. Warm-ups are
 * excluded outright rather than following the Include Warmup preference, the
 * same rule `recordPersonalRecords` holds: a warm-up must never earn a badge,
 * and a preference toggle must never take one away.
 */
export function achievementSessionsQuery() {
  return db
    .select({
      exerciseId: exercises.id,
      sourceId: exercises.sourceId,
      name: exercises.name,
      trackingType: exercises.trackingType,
      equipment: exercises.equipment,
      mechanic: exercises.mechanic,
      level: exercises.level,
      category: exercises.category,
      primaryMuscles: exercises.primaryMuscles,
      tags: exercises.tags,
      startedAt: workouts.startedAt,
      topWeightKg: sql<number>`COALESCE(MAX(${sets.weightKg}), 0)`,
      bestReps: sql<number>`COALESCE(MAX(COALESCE(${sets.reps}, 0)), 0)`,
      bestHoldSeconds: sql<number>`COALESCE(MAX(COALESCE(${sets.durationSeconds}, 0)), 0)`,
      durationSeconds: sql<number>`COALESCE(SUM(COALESCE(${sets.durationSeconds}, 0)), 0)`,
      distanceM: sql<number>`COALESCE(SUM(COALESCE(${sets.distanceM}, 0)), 0)`,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(
      and(
        eq(exercises.isCustom, false),
        eq(sets.completed, true),
        workSets(false),
        isNull(sets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
        isNull(exercises.deletedAt),
        isNotNull(workouts.finishedAt)
      )
    )
    .groupBy(exercises.id, workouts.id)
    .orderBy(desc(workouts.startedAt));
}

export type AchievementSession = Awaited<ReturnType<typeof achievementSessionsQuery>>[number];
