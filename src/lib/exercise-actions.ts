import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/id';
import { exercises, templateExercises } from '@/db/schema';
import { exerciseGroup } from '@/lib/exercise-groups';
import { deleteExercisePhoto } from '@/lib/exercise-photos';
import { buildSearchText } from '@/lib/exercise-search';
import type { TrackingType } from '@/lib/tracking-types';

type ExerciseForm = {
  name: string;
  /** An `EXERCISE_GROUPS` id — the vocabulary the library browses by. */
  group: string | null;
  trackingType: TrackingType;
  /** A filename in the exercise photo store, or null for no thumbnail. */
  imageFile: string | null;
};

const derived = ({ name, group, trackingType, imageFile }: ExerciseForm) => {
  const picked = group ? exerciseGroup(group) : undefined;

  return {
    name: name.trim(),
    // `level` is a NOT NULL column the form doesn't ask about. `category` places
    // the exercise in the Cardio group, which is the one group not backed by a
    // muscle, so the tracking type stands in when nothing was picked.
    level: 'beginner',
    category: picked
      ? (picked.category ?? 'strength')
      : trackingType === 'distance_duration'
        ? 'cardio'
        : 'strength',
    trackingType,
    imageFile,
    // The group's first muscle is what its own filter matches on.
    primaryMuscles: picked?.muscles ? [picked.muscles[0]] : [],
  };
};

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

  // The one place a replaced thumbnail is dropped — nothing else reads the file.
  const [previous] = await db
    .select({ imageFile: exercises.imageFile })
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  if (previous?.imageFile && previous.imageFile !== row.imageFile) {
    deleteExercisePhoto(previous.imageFile);
  }

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

  // The row is only soft-deleted, but its photo has no other reader.
  const [row] = await db
    .select({ imageFile: exercises.imageFile })
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);
  deleteExercisePhoto(row?.imageFile);

  await db
    .update(templateExercises)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(and(eq(templateExercises.exerciseId, id), isNull(templateExercises.deletedAt)));

  await db.update(exercises).set({ deletedAt, updatedAt: deletedAt }).where(eq(exercises.id, id));
}
