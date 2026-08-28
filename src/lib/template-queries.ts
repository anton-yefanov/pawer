import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, folders, templateExercises, templates, templateSets } from '@/db/schema';

/** Query *builders*, same contract as workout-queries.ts — nothing here is awaited. */

export function foldersQuery() {
  return db
    .select()
    .from(folders)
    .where(isNull(folders.deletedAt))
    .orderBy(asc(folders.position), asc(folders.createdAt));
}

export function folderQuery(folderId: string) {
  return db.select().from(folders).where(eq(folders.id, folderId)).limit(1);
}

export function templatesQuery(isBuiltIn: boolean) {
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.isBuiltIn, isBuiltIn), isNull(templates.deletedAt)))
    .orderBy(asc(templates.position), asc(templates.createdAt));
}

export function templateQuery(templateId: string) {
  return db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
}

/**
 * Every template's exercises in one pass. The Start Workout grid groups these by
 * `templateId` rather than running a query per card.
 */
export function templateCardExercisesQuery() {
  return db
    .select({
      templateId: templateExercises.templateId,
      position: templateExercises.position,
      name: exercises.name,
      sourceId: exercises.sourceId,
      imageFile: exercises.imageFile,
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
    .where(isNull(templateExercises.deletedAt))
    .orderBy(asc(templateExercises.templateId), asc(templateExercises.position));
}

export function templateExercisesQuery(templateId: string) {
  return db
    .select({
      id: templateExercises.id,
      exerciseId: templateExercises.exerciseId,
      position: templateExercises.position,
      notes: templateExercises.notes,
      restSeconds: templateExercises.restSeconds,
      supersetId: templateExercises.supersetId,
      setCount: sql<number>`(SELECT COUNT(*) FROM ${templateSets} ts
        WHERE ts.template_exercise_id = ${templateExercises.id} AND ts.deleted_at IS NULL)`,
      name: exercises.name,
      sourceId: exercises.sourceId,
      imageFile: exercises.imageFile,
      trackingType: exercises.trackingType,
      primaryMuscles: exercises.primaryMuscles,
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(templateExercises.exerciseId, exercises.id))
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position));
}

export function templateSetsQuery(templateId: string) {
  return db
    .select({
      id: templateSets.id,
      templateExerciseId: templateSets.templateExerciseId,
      position: templateSets.position,
      weightKg: templateSets.weightKg,
      reps: templateSets.reps,
      durationSeconds: templateSets.durationSeconds,
      distanceM: templateSets.distanceM,
      setType: templateSets.setType,
      notes: templateSets.notes,
    })
    .from(templateSets)
    .innerJoin(templateExercises, eq(templateSets.templateExerciseId, templateExercises.id))
    .where(
      and(
        eq(templateExercises.templateId, templateId),
        isNull(templateExercises.deletedAt),
        isNull(templateSets.deletedAt),
      ),
    )
    .orderBy(asc(templateSets.position));
}

export type TemplateCardExercise = Awaited<ReturnType<typeof templateCardExercisesQuery>>[number];
export type TemplateExerciseRow = Awaited<ReturnType<typeof templateExercisesQuery>>[number];
export type TemplateSetRow = Awaited<ReturnType<typeof templateSetsQuery>>[number];
