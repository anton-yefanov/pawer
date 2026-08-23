import type { ImageSource } from 'expo-image';

import { asCardPose, type CardPose } from '@/constants/card-poses';

/**
 * Resolves a template's cover art: the pose the user pinned, or — the default —
 * one derived from the muscles its exercises target.
 *
 * Same contract as exercise-images.ts: buckets without art yet fall back to a
 * placeholder, and when the real art lands only `SOURCES` changes — no screen
 * ever builds an asset path itself. Metro needs static literal paths, so the maps
 * have to be one `require` line per entry rather than assembled at runtime.
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
  back: require('@/assets/templates/back.webp') as ImageSource,
  legs: PLACEHOLDER,
  shoulders: PLACEHOLDER,
  arms: PLACEHOLDER,
  core: PLACEHOLDER,
  fullBody: PLACEHOLDER,
};

const POSES: Record<CardPose, ImageSource> = {
  pose1: require('@/assets/templates/pose1.webp') as ImageSource,
  pose2: require('@/assets/templates/pose2.webp') as ImageSource,
  pose3: require('@/assets/templates/pose3.webp') as ImageSource,
  pose4: require('@/assets/templates/pose4.webp') as ImageSource,
  pose5: require('@/assets/templates/pose5.webp') as ImageSource,
  pose6: require('@/assets/templates/pose6.webp') as ImageSource,
  pose7: require('@/assets/templates/pose7.webp') as ImageSource,
};

/** Muscle vocabulary is free-exercise-db's, the same strings as `MUSCLE_OPTIONS`. */
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

export function poseImage(pose: CardPose): ImageSource {
  return POSES[pose];
}

/** The art a card actually shows: a pinned pose wins over the muscle bucket. */
export function templateCover(
  image: string | null | undefined,
  primaryMuscles: readonly string[],
): ImageSource {
  const pose = asCardPose(image);
  return pose ? POSES[pose] : SOURCES[templateBucket(primaryMuscles)];
}
