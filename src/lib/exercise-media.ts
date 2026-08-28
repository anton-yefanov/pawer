import type { ImageSource } from 'expo-image';

import { EXERCISE_MEDIA } from '@/lib/exercise-media-map';

/** 150px square, centre-cropped, for the 48pt circle in a list row. */
export function exerciseThumbnail(sourceId: string | null): ImageSource | null {
  return sourceId === null ? null : (EXERCISE_MEDIA[sourceId]?.thumb ?? null);
}

/** The clip's first frame, drawn under it until it has one of its own. */
export function exercisePoster(sourceId: string | null): ImageSource | null {
  return sourceId === null ? null : (EXERCISE_MEDIA[sourceId]?.poster ?? null);
}

/** The bundled demo clip. Null only for a user's own exercise. */
export function exerciseVideo(sourceId: string | null): number | null {
  return sourceId === null ? null : (EXERCISE_MEDIA[sourceId]?.video ?? null);
}
