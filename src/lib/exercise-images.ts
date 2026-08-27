import type { ImageSource } from 'expo-image';

import { EXERCISE_ART } from '@/lib/exercise-image-map';

const PLACEHOLDER_THUMB = require('@/assets/exercises/thumb/placeholder.webp') as ImageSource;

/** 150px square, for 48pt list rows. */
export function exerciseThumbnail(sourceId: string | null): ImageSource {
  return (sourceId && EXERCISE_ART[sourceId]?.thumb) || PLACEHOLDER_THUMB;
}

/**
 * The two 600px frames for the detail view, in order. A frame is null when no
 * master exists for it — the caller draws its own empty square, so a missing
 * second frame never silently repeats the first.
 */
export function exerciseFrames(
  sourceId: string | null,
): readonly [ImageSource | null, ImageSource | null] {
  return (sourceId && EXERCISE_ART[sourceId]?.frames) || [null, null];
}

/** True once real art exists for this exercise — drives "illustration coming soon" UI. */
export function hasRealArtwork(sourceId: string | null): boolean {
  return sourceId !== null && sourceId in EXERCISE_ART;
}
