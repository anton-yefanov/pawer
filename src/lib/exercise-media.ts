import type { ImageSource } from 'expo-image';

import { exercisePhotoSource } from '@/lib/exercise-photos';
import { EXERCISE_MEDIA } from '@/lib/exercise-media-map';

/**
 * What an exercise is drawn from: the seeded clip and its stills, keyed by
 * `sourceId`, or the photo a user picked for their own exercise, which is the
 * only art a custom row ever has.
 */
export type ExerciseArt = { sourceId: string | null; imageFile: string | null };

/** 150px square, centre-cropped, for the 48pt circle in a list row. */
export function exerciseThumbnail({ sourceId, imageFile }: ExerciseArt): ImageSource | null {
  if (imageFile) return exercisePhotoSource(imageFile);
  return sourceId === null ? null : (EXERCISE_MEDIA[sourceId]?.thumb ?? null);
}

/** The clip's first frame, drawn under it until it has one of its own. */
export function exercisePoster({ sourceId, imageFile }: ExerciseArt): ImageSource | null {
  if (imageFile) return exercisePhotoSource(imageFile);
  return sourceId === null ? null : (EXERCISE_MEDIA[sourceId]?.poster ?? null);
}

/** The bundled demo clip. Null only for a user's own exercise. */
export function exerciseVideo(sourceId: string | null): number | null {
  return sourceId === null ? null : (EXERCISE_MEDIA[sourceId]?.video ?? null);
}
