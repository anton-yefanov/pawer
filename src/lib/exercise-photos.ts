import { type ImageSource } from 'expo-image';

import { photoStore } from '@/lib/photo-store';

/**
 * Every clip is encoded at 1084x600 — see scripts/build-videos.mjs. It lives here
 * rather than in `exercise-media.ts` because that module reads this one, and a
 * constant imported the other way is still undefined when the store is built.
 */
export const CLIP_ASPECT = 1084 / 600;

/**
 * The thumbnail a user picks for their own exercise. Cropped to the clip aspect
 * so it fills the exact frame a seeded exercise's video does, and centre-cropped
 * again by the 48pt circle in a list row — which is how the shipped thumbs are
 * cut from their posters too (`scripts/build-images.mjs`).
 */
const photos = photoStore({ directory: 'exercise-photos', aspect: CLIP_ASPECT, width: 1084 });

export function exercisePhotoSource(file: string): ImageSource {
  return photos.source(file);
}

export function importExercisePhoto(sourceUri: string): Promise<string> {
  return photos.import(sourceUri);
}

export function deleteExercisePhoto(file: string | null | undefined): void {
  photos.delete(file);
}
