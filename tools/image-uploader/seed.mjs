/**
 * The seed as the uploader reads it. Local only: the page gets the same list as
 * a static exercises.json, written into public/ by scripts/uploader-seed.mjs.
 */
import { readFileSync } from 'node:fs';

import { ROOT } from './paths.mjs';

export const exercises = JSON.parse(
  readFileSync(`${ROOT}/src/db/seed/exercises.json`, 'utf8'),
).map(({ sourceId, name, equipment, primaryMuscles, instructions }) => ({
  sourceId,
  name,
  equipment,
  muscle: primaryMuscles[0] ?? null,
  instructions,
}));

export const byId = new Map(exercises.map((e) => [e.sourceId, e]));
