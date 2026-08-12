import { db } from '@/db/client';
import { newId } from '@/db/id';
import { exercises } from '@/db/schema';
import { buildSearchText } from '@/lib/exercise-search';
import type { TrackingType } from '@/lib/tracking-types';

/**
 * `sourceId` stays null: it keys the seed upsert and the illustration lookup,
 * and SQLite treats NULLs as distinct, so any number of custom rows coexist
 * under the unique index — and a re-seed can never match, let alone overwrite,
 * one of them.
 */
export async function createCustomExercise({
  name,
  muscle,
  trackingType,
}: {
  name: string;
  muscle: string | null;
  trackingType: TrackingType;
}): Promise<string> {
  const id = newId();
  const row = {
    id,
    sourceId: null,
    name: name.trim(),
    // NOT NULL columns the form doesn't ask about. `category` only ever surfaces
    // in the detail facts list, so the tracking type is enough to place it.
    level: 'beginner',
    category: trackingType === 'distance_duration' ? 'cardio' : 'strength',
    trackingType,
    primaryMuscles: muscle ? [muscle] : [],
    isCustom: true,
  };

  await db.insert(exercises).values({ ...row, searchText: buildSearchText(row) });

  return id;
}
