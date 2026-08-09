import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/id';
import { sets, templateExercises, templates, workoutExercises, workouts } from '@/db/schema';
import { activeWorkoutId, type StartWorkoutResult } from '@/lib/workout-actions';

const touch = () => ({ updatedAt: Date.now() });

async function nextPersonalPosition(): Promise<number> {
  const last = await db
    .select({ position: templates.position })
    .from(templates)
    .where(and(eq(templates.isBuiltIn, false), isNull(templates.deletedAt)))
    .orderBy(desc(templates.position))
    .limit(1)
    .get();
  return (last?.position ?? -1) + 1;
}

export async function createTemplate({
  name,
  exerciseIds,
}: {
  name: string;
  exerciseIds: readonly string[];
}): Promise<string> {
  const id = newId();
  await db
    .insert(templates)
    .values({ id, name, position: await nextPersonalPosition(), isBuiltIn: false });

  if (exerciseIds.length > 0) {
    await db.insert(templateExercises).values(
      exerciseIds.map((exerciseId, position) => ({
        id: newId(),
        templateId: id,
        exerciseId,
        position,
      })),
    );
  }

  return id;
}

/**
 * Reconciles the exercise list against `exerciseIds` rather than replacing it,
 * so a row the user kept holds on to its `targetSets` / `targetReps` / rest.
 */
export async function updateTemplate({
  id,
  name,
  exerciseIds,
}: {
  id: string;
  name: string;
  exerciseIds: readonly string[];
}): Promise<void> {
  const now = Date.now();
  await db.update(templates).set({ name, updatedAt: now }).where(eq(templates.id, id));

  const existing = await db
    .select({ id: templateExercises.id, exerciseId: templateExercises.exerciseId })
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, id), isNull(templateExercises.deletedAt)))
    .all();

  const kept = new Map(existing.map((row) => [row.exerciseId, row.id]));
  const wanted = new Set(exerciseIds);

  for (const row of existing) {
    if (wanted.has(row.exerciseId)) continue;
    await db
      .update(templateExercises)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(templateExercises.id, row.id));
  }

  for (const [position, exerciseId] of exerciseIds.entries()) {
    const rowId = kept.get(exerciseId);
    if (rowId) {
      await db
        .update(templateExercises)
        .set({ position, updatedAt: now })
        .where(eq(templateExercises.id, rowId));
    } else {
      await db
        .insert(templateExercises)
        .values({ id: newId(), templateId: id, exerciseId, position });
    }
  }
}

/** `position` is rewritten wholesale — gaps from a soft delete never matter. */
export async function reorderTemplates(orderedIds: readonly string[]): Promise<void> {
  const now = Date.now();
  for (const [position, id] of orderedIds.entries()) {
    await db.update(templates).set({ position, updatedAt: now }).where(eq(templates.id, id));
  }
}

/** A copy is always personal, even when the source is app-shipped. */
export async function duplicateTemplate(templateId: string): Promise<string> {
  const source = await db.select().from(templates).where(eq(templates.id, templateId)).get();
  if (!source) throw new Error(`No template ${templateId}`);

  const rows = await db
    .select()
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position))
    .all();

  const id = newId();
  await db.insert(templates).values({
    id,
    name: `${source.name} Copy`,
    notes: source.notes,
    position: await nextPersonalPosition(),
    isBuiltIn: false,
    folderId: source.isBuiltIn ? null : source.folderId,
  });

  if (rows.length > 0) {
    await db.insert(templateExercises).values(
      rows.map((row, position) => ({
        id: newId(),
        templateId: id,
        exerciseId: row.exerciseId,
        position,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        restSeconds: row.restSeconds,
      })),
    );
  }

  return id;
}

/** Soft delete: workouts started from this template keep a valid `templateId`. */
export async function deleteTemplate(templateId: string): Promise<void> {
  const source = await db
    .select({ isBuiltIn: templates.isBuiltIn })
    .from(templates)
    .where(eq(templates.id, templateId))
    .get();
  if (!source || source.isBuiltIn) return;

  const deletedAt = Date.now();
  await db
    .update(templateExercises)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(templateExercises.templateId, templateId));
  await db
    .update(templates)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(templates.id, templateId));
}

/**
 * Sets are inserted blank rather than through `addSet`, which copies the
 * previous set's weight and reps — carrying numbers forward here would show the
 * user figures they never logged for this session.
 */
export async function startWorkoutFromTemplate(templateId: string): Promise<StartWorkoutResult> {
  const active = await activeWorkoutId();
  if (active) return { status: 'blocked', workoutId: active };

  const template = await db
    .select({ name: templates.name })
    .from(templates)
    .where(eq(templates.id, templateId))
    .get();

  const planned = await db
    .select({
      exerciseId: templateExercises.exerciseId,
      position: templateExercises.position,
      targetSets: templateExercises.targetSets,
      restSeconds: templateExercises.restSeconds,
    })
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position))
    .all();

  const workoutId = newId();
  const startedAt = Date.now();
  await db.insert(workouts).values({
    id: workoutId,
    templateId,
    name: template?.name ?? null,
    startedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  for (const [position, row] of planned.entries()) {
    const workoutExerciseId = newId();
    await db.insert(workoutExercises).values({
      id: workoutExerciseId,
      workoutId,
      exerciseId: row.exerciseId,
      position,
      restSeconds: row.restSeconds,
    });

    const count = Math.max(1, row.targetSets);
    await db.insert(sets).values(
      Array.from({ length: count }, (_, index) => ({
        id: newId(),
        workoutExerciseId,
        position: index,
      })),
    );
  }

  await db
    .update(templates)
    .set({ lastUsedAt: startedAt, ...touch() })
    .where(eq(templates.id, templateId));

  return { status: 'started', workoutId };
}
