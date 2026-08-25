/**
 * Filesystem locations, kept out of master-spec.mjs so the deployed functions
 * never import them — a `resolve()` off the repo root makes the Vercel bundler
 * guess, and it guesses by bundling all of assets/masters/.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const EXERCISE_MASTERS = resolve(ROOT, 'assets/masters/exercises');

export const masterPath = (sourceId, frame) =>
  resolve(EXERCISE_MASTERS, `${sourceId}_${frame}.png`);
