import type { ImageSource } from 'expo-image';

/**
 * Resolves an exercise's illustrations from its upstream slug (`sourceId`).
 *
 * Right now every exercise resolves to the same placeholder pair. When the real
 * art lands, replace the bodies of these two functions with a lookup into a
 * generated require-map — nothing else in the app needs to change, because no
 * screen ever builds an asset path itself.
 *
 * Metro requires static literal paths, so the eventual map has to be generated
 * (one `require` line per slug) rather than assembled at runtime.
 */

const PLACEHOLDER_THUMB = require('@/assets/exercises/thumb/placeholder.webp') as ImageSource;
const PLACEHOLDER_DETAIL: readonly [ImageSource, ImageSource] = [
  require('@/assets/exercises/detail/placeholder_1.webp') as ImageSource,
  require('@/assets/exercises/detail/placeholder_2.webp') as ImageSource,
];

/** 150px square, for 48pt list rows. */
export function exerciseThumbnail(_sourceId: string | null): ImageSource {
  return PLACEHOLDER_THUMB;
}

/**
 * The two 600px frames for the detail view, in order. Cross-fade between them
 * at ~150ms — a hard cut reads as a broken image loader, not as a rep.
 */
export function exerciseFrames(_sourceId: string | null): readonly [ImageSource, ImageSource] {
  return PLACEHOLDER_DETAIL;
}

/** True once real art exists for this exercise — drives "illustration coming soon" UI. */
export function hasRealArtwork(_sourceId: string | null): boolean {
  return false;
}
