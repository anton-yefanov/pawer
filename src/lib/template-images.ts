import type { ImageSource } from 'expo-image';

/**
 * Resolves a template's cover art from the muscles its exercises target.
 *
 * Same contract as exercise-images.ts: every bucket resolves to one placeholder
 * today, and when the real art lands only `SOURCES` changes — no screen ever
 * builds an asset path itself. Metro needs static literal paths, so the eventual
 * map has to be one `require` line per bucket rather than assembled at runtime.
 */

export type TemplateBucket =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'fullBody';

const PLACEHOLDER = require('@/assets/mascot/idle.webp') as ImageSource;

const SOURCES: Record<TemplateBucket, ImageSource> = {
  chest: PLACEHOLDER,
  back: PLACEHOLDER,
  legs: PLACEHOLDER,
  shoulders: PLACEHOLDER,
  arms: PLACEHOLDER,
  core: PLACEHOLDER,
  fullBody: PLACEHOLDER,
};

/** Muscle vocabulary is free-exercise-db's, the same strings as MUSCLE_MENU. */
const BUCKET_BY_MUSCLE: Record<string, TemplateBucket> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  neck: 'back',
  quadriceps: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  abdominals: 'core',
};

/**
 * The dominant bucket across a template's exercises. A tie, or a split where no
 * single bucket owns a majority of the work, reads as a full-body session.
 */
export function templateBucket(primaryMuscles: readonly string[]): TemplateBucket {
  const counts = new Map<TemplateBucket, number>();
  for (const muscle of primaryMuscles) {
    const bucket = BUCKET_BY_MUSCLE[muscle];
    if (bucket) counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  let top: TemplateBucket | null = null;
  let topCount = 0;
  let tied = false;
  for (const [bucket, count] of counts) {
    if (count > topCount) {
      top = bucket;
      topCount = count;
      tied = false;
    } else if (count === topCount) {
      tied = true;
    }
  }

  if (!top || tied || topCount * 2 <= primaryMuscles.length) return 'fullBody';
  return top;
}

export function templateImage(bucket: TemplateBucket): ImageSource {
  return SOURCES[bucket];
}
