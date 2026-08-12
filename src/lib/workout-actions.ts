import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/id';
import { personalRecords, sets, workoutExercises, workouts } from '@/db/schema';
import { recordPersonalRecords } from '@/lib/personal-records';
import type { SetType } from '@/lib/set-types';

const touch = () => ({ updatedAt: Date.now() });

/**
 * The result of any "start a workout" action. There is only ever one active
 * workout: a second one would strand the first, since the app surfaces the most
 * recently started session and nothing else. `blocked` carries the session that
 * is already running so the caller can offer to resume it.
 */
export type StartWorkoutResult =
  | { status: 'started'; workoutId: string }
  | { status: 'blocked'; workoutId: string };

export async function activeWorkoutId(): Promise<string | null> {
  const row = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(isNull(workouts.finishedAt), isNull(workouts.deletedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1)
    .get();
  return row?.id ?? null;
}

export async function startEmptyWorkout(): Promise<StartWorkoutResult> {
  const active = await activeWorkoutId();
  if (active) return { status: 'blocked', workoutId: active };

  const id = newId();
  const startedAt = Date.now();
  await db.insert(workouts).values({ id, startedAt, createdAt: startedAt, updatedAt: startedAt });
  return { status: 'started', workoutId: id };
}

export async function updateWorkout(
  workoutId: string,
  patch: { name?: string | null; notes?: string | null; startedAt?: number }
): Promise<void> {
  await db
    .update(workouts)
    .set({ ...patch, ...touch() })
    .where(eq(workouts.id, workoutId));
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string
): Promise<string> {
  const last = await db
    .select({ position: workoutExercises.position })
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
    .orderBy(desc(workoutExercises.position))
    .limit(1)
    .get();

  const id = newId();
  await db
    .insert(workoutExercises)
    .values({ id, workoutId, exerciseId, position: (last?.position ?? -1) + 1 });
  await addSet(id);
  return id;
}

export async function removeWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const deletedAt = Date.now();
  await db
    .update(sets)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(sets.workoutExerciseId, workoutExerciseId));
  await db
    .update(workoutExercises)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(workoutExercises.id, workoutExerciseId));
}

/** `position` is rewritten wholesale — gaps left by a soft delete never matter. */
export async function reorderWorkoutExercises(orderedIds: readonly string[]): Promise<void> {
  const now = Date.now();
  for (const [position, id] of orderedIds.entries()) {
    await db
      .update(workoutExercises)
      .set({ position, updatedAt: now })
      .where(eq(workoutExercises.id, id));
  }
}

export async function setWorkoutExerciseNotes(
  workoutExerciseId: string,
  notes: string | null
): Promise<void> {
  await db
    .update(workoutExercises)
    .set({ notes, ...touch() })
    .where(eq(workoutExercises.id, workoutExerciseId));
}

export async function setWorkoutExerciseRest(
  workoutExerciseId: string,
  restSeconds: number | null
): Promise<void> {
  await db
    .update(workoutExercises)
    .set({ restSeconds, ...touch() })
    .where(eq(workoutExercises.id, workoutExerciseId));
}

/**
 * Positions are never renumbered on delete — the number shown in the Set column
 * is the row's position in the live list, so soft deletes leave no visible gap.
 *
 * The last set's values carry forward but its `setType` deliberately does not:
 * adding a set after a warm-up would otherwise silently log another warm-up.
 */
export async function addSet(workoutExerciseId: string): Promise<string> {
  const last = await db
    .select({
      position: sets.position,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceM: sets.distanceM,
    })
    .from(sets)
    .where(and(eq(sets.workoutExerciseId, workoutExerciseId), isNull(sets.deletedAt)))
    .orderBy(desc(sets.position))
    .limit(1)
    .get();

  const id = newId();
  await db.insert(sets).values({
    id,
    workoutExerciseId,
    position: (last?.position ?? -1) + 1,
    weightKg: last?.weightKg ?? null,
    reps: last?.reps ?? null,
    durationSeconds: last?.durationSeconds ?? null,
    distanceM: last?.distanceM ?? null,
  });
  return id;
}

export async function updateSetValues(
  setId: string,
  values: {
    weightKg?: number | null;
    reps?: number | null;
    durationSeconds?: number | null;
    distanceM?: number | null;
  }
): Promise<void> {
  await db
    .update(sets)
    .set({ ...values, ...touch() })
    .where(eq(sets.id, setId));
}

export async function setSetType(setId: string, setType: SetType): Promise<void> {
  await db
    .update(sets)
    .set({ setType, ...touch() })
    .where(eq(sets.id, setId));
}

export async function setSetCompleted(setId: string, completed: boolean): Promise<void> {
  const now = Date.now();
  await db
    .update(sets)
    .set({ completed, completedAt: completed ? now : null, updatedAt: now })
    .where(eq(sets.id, setId));
}

export async function deleteSet(setId: string): Promise<void> {
  const deletedAt = Date.now();
  await db.update(sets).set({ deletedAt, updatedAt: deletedAt }).where(eq(sets.id, setId));
}

/**
 * Only sets that carry a value — an untouched row has nothing to complete.
 * Which column matters depends on the exercise's tracking type, but checking all
 * three is equivalent here and saves joining back to `exercises`.
 */
export async function completeUnfinishedSets(workoutId: string): Promise<void> {
  const now = Date.now();
  await db
    .update(sets)
    .set({ completed: true, completedAt: now, updatedAt: now })
    .where(
      and(
        eq(sets.completed, false),
        isNull(sets.deletedAt),
        sql`(${sets.reps} > 0 OR ${sets.durationSeconds} > 0 OR ${sets.distanceM} > 0)`,
        sql`${sets.workoutExerciseId} IN (
          SELECT id FROM ${workoutExercises}
          WHERE workout_id = ${workoutId} AND deleted_at IS NULL
        )`
      )
    );
}

/** Sets left empty are noise in history, so they go rather than getting logged as zeroes. */
async function purgeIncompleteSets(workoutId: string): Promise<void> {
  const now = Date.now();
  await db
    .update(sets)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(sets.completed, false),
        isNull(sets.deletedAt),
        sql`${sets.workoutExerciseId} IN (
          SELECT id FROM ${workoutExercises}
          WHERE workout_id = ${workoutId} AND deleted_at IS NULL
        )`
      )
    );
}

export async function finishWorkout(workoutId: string): Promise<void> {
  const now = Date.now();
  await purgeIncompleteSets(workoutId);

  await db
    .update(workouts)
    .set({ finishedAt: now, updatedAt: now })
    .where(eq(workouts.id, workoutId));

  await recordPersonalRecords(workoutId);
}

/**
 * Saving a finished workout that was reopened for editing. Anything the user
 * typed counts — they are entering history, not logging live, so a set with
 * numbers in it is a set they did, ticked or not. `finishedAt` is left alone so
 * the workout keeps its place in history.
 */
export async function saveWorkoutEdits(workoutId: string): Promise<void> {
  await completeUnfinishedSets(workoutId);
  await purgeIncompleteSets(workoutId);
  await db.update(workouts).set(touch()).where(eq(workouts.id, workoutId));
  await recordPersonalRecords(workoutId);
}

/**
 * Unlike `cancelWorkout` this also drops the workout's records: a finished
 * workout has them, and leaving them behind would keep a deleted session's PRs
 * standing and counted in history. Records it had beaten stay beaten — restoring
 * the previous holder would mean recomputing every standing record.
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  await cancelWorkout(workoutId);

  const deletedAt = Date.now();
  await db
    .update(personalRecords)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(and(eq(personalRecords.workoutId, workoutId), isNull(personalRecords.deletedAt)));
}

/**
 * A fresh session with the same exercises. Sets come back blank and in the same
 * number, for the reason `startWorkoutFromTemplate` gives: carrying the old
 * numbers forward would show figures the user hasn't lifted today. Their
 * `setType` does carry over — a warm-up is part of how the session is run, not a
 * figure that was lifted.
 */
export async function repeatWorkout(workoutId: string): Promise<StartWorkoutResult> {
  const active = await activeWorkoutId();
  if (active) return { status: 'blocked', workoutId: active };

  const source = await db.select().from(workouts).where(eq(workouts.id, workoutId)).get();
  if (!source) throw new Error(`No workout ${workoutId}`);

  const planned = await db
    .select({
      id: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      restSeconds: workoutExercises.restSeconds,
    })
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.position))
    .all();

  const plannedSets = await db
    .select({ workoutExerciseId: sets.workoutExerciseId, setType: sets.setType })
    .from(sets)
    .where(
      and(
        inArray(
          sets.workoutExerciseId,
          planned.map((row) => row.id)
        ),
        isNull(sets.deletedAt)
      )
    )
    .orderBy(asc(sets.position))
    .all();

  const id = newId();
  const startedAt = Date.now();
  await db.insert(workouts).values({
    id,
    templateId: source.templateId,
    name: source.name,
    startedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  for (const [position, row] of planned.entries()) {
    const workoutExerciseId = newId();
    await db.insert(workoutExercises).values({
      id: workoutExerciseId,
      workoutId: id,
      exerciseId: row.exerciseId,
      position,
      restSeconds: row.restSeconds,
    });

    const sourceSets = plannedSets.filter((set) => set.workoutExerciseId === row.id);
    const setTypes = sourceSets.length > 0 ? sourceSets.map((set) => set.setType) : ['normal'];

    await db.insert(sets).values(
      setTypes.map((setType, index) => ({
        id: newId(),
        workoutExerciseId,
        position: index,
        setType,
      }))
    );
  }

  return { status: 'started', workoutId: id };
}

export async function cancelWorkout(workoutId: string): Promise<void> {
  const deletedAt = Date.now();
  await db
    .update(sets)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(
      sql`${sets.workoutExerciseId} IN (
        SELECT id FROM ${workoutExercises} WHERE workout_id = ${workoutId}
      )`
    );
  await db
    .update(workoutExercises)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(workoutExercises.workoutId, workoutId));
  await db
    .update(workouts)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(workouts.id, workoutId));
}
