import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/id';
import { exercises, templateExercises } from '@/db/schema';
import { buildSearchText } from '@/lib/exercise-search';
import type { TrackingType } from '@/lib/tracking-types';

type ExerciseForm = {
  name: string;
  muscle: string | null;
  trackingType: TrackingType;
  description?: string;
};

const derived = ({ name, muscle, trackingType, description }: ExerciseForm) => ({
  name: name.trim(),
  // NOT NULL columns the form doesn't ask about. `category` only ever surfaces
  // in the detail facts list, so the tracking type is enough to place it.
  level: 'beginner',
  category: trackingType === 'distance_duration' ? 'cardio' : 'strength',
  trackingType,
  primaryMuscles: muscle ? [muscle] : [],
  description: description?.trim() || null,
});

/**
 * `sourceId` stays null: it keys the seed upsert and the illustration lookup,
 * and SQLite treats NULLs as distinct, so any number of custom rows coexist
 * under the unique index — and a re-seed can never match, let alone overwrite,
 * one of them.
 */
export async function createCustomExercise(form: ExerciseForm): Promise<string> {
  const id = newId();
  const row = { id, sourceId: null, ...derived(form), isCustom: true };

  await db.insert(exercises).values({ ...row, searchText: buildSearchText(row) });

  return id;
}

export async function updateCustomExercise(id: string, form: ExerciseForm) {
  const row = derived(form);

  await db
    .update(exercises)
    .set({ ...row, searchText: buildSearchText(row), updatedAt: Date.now() })
    .where(eq(exercises.id, id));
}

/**
 * Soft delete, and only as far as the library: three tables carry a foreign key
 * to `exercises.id`, and logged sets have to keep rendering under their name, so
 * only the template rows follow the exercise out. History is left alone.
 */
export async function deleteCustomExercise(id: string) {
  const deletedAt = Date.now();

  await db
    .update(templateExercises)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(and(eq(templateExercises.exerciseId, id), isNull(templateExercises.deletedAt)));

  await db.update(exercises).set({ deletedAt, updatedAt: deletedAt }).where(eq(exercises.id, id));
}
