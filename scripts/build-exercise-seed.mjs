#!/usr/bin/env node
/**
 * Builds the bundled exercise seed from the purchased library's metadata.
 *
 *   node scripts/build-exercise-seed.mjs
 *
 * Output: src/db/seed/exercises.json
 *
 * Exercise UUIDs are derived deterministically (UUIDv5) from the vendor slug,
 * so re-running this after a metadata refresh keeps the same ids and never
 * orphans logged sets.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tagsFor, unknownAliasIds } from './exercise-tags.mjs';
import { METADATA_PATH, groupOf, isCardio } from './exercise-taxonomy.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/db/seed/exercises.json');
const TEMPLATES = resolve(ROOT, 'src/db/seed/templates.json');

/** Fixed namespace UUID for this app. Changing it re-ids the entire library. */
const NAMESPACE = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';

/** RFC 4122 v5 (SHA-1, name-based) UUID. */
function uuidv5(name, namespace) {
  const hex = namespace.replace(/-/g, '');
  const nsBytes = Buffer.from(hex, 'hex');
  const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const s = bytes.toString('hex');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

const FORCE = new Set(['push', 'pull', 'static']);
const LEVEL = new Set(['beginner', 'intermediate', 'advanced']);
const MECHANIC = new Set(['compound', 'isolation']);
const CATEGORY = new Set(['strength', 'cardio', 'plyometrics', 'stretching']);
const TRACKING_TYPE = new Set([
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
]);

/**
 * Which fields a set logs. The vendor has no such field, so it is derived here —
 * see `src/lib/tracking-types.ts` for what each value renders.
 *
 * The rules below cover the bulk; these are the movements where equipment and
 * movement pattern lie about how the exercise is actually loaded.
 */
const TRACKING_OVERRIDES = new Map(
  Object.entries({
    // Cardio the app cannot measure a distance for.
    'battle-ropes': 'duration',
    'jump-rope': 'duration',
    'jumping-jack': 'duration',
    'shadow-boxing': 'duration',

    // Isometric holds: a rep count says nothing, the clock is the whole set.
    'dead-hang': 'duration',
    'elbow-side-plank': 'duration',
    'front-plank': 'duration',
    'hand-plank': 'duration',
    'kettlebell-farmers-carry': 'duration',
    'split-squat-isometric-hold': 'duration',
    'wall-sit': 'duration',

    // Tagged Stretch, but loaded and counted in reps.
    'barbell-spinal-jefferson-curl': 'weight_reps',
    'dumbbell-spinal-jefferson-curl': 'weight_reps',
    'kettlebell-spinal-jefferson-curl': 'weight_reps',
    'bodyweight-spinal-jefferson-curl': 'bodyweight_reps',

    // The machine and the band take weight off rather than adding it. Matched
    // by name, not by an "assisted" substring: the kettlebell-assisted split
    // squat is a loaded movement that happens to share the word.
    'band-assisted-pull-up': 'assisted_bodyweight',
    'machine-assisted-pull-up': 'assisted_bodyweight',

    // Loadable with a belt or a dumbbell between the feet. `weighted_bodyweight`
    // rather than `bodyweight_reps` because the weight cell is optional in
    // both, so it is strictly the more capable of the two.
    'back-extension': 'weighted_bodyweight',
    'bench-dips': 'weighted_bodyweight',
    'captains-chair-knee-raise': 'weighted_bodyweight',
    'chin-ups': 'weighted_bodyweight',
    'decline-sit-up': 'weighted_bodyweight',
    'hanging-knee-raises': 'weighted_bodyweight',
    'neutral-grip-pull-up': 'weighted_bodyweight',
    'parralel-bar-dips': 'weighted_bodyweight',
    'pull-ups': 'weighted_bodyweight',
    'single-leg-back-extension': 'weighted_bodyweight',
    'toes-to-bar': 'weighted_bodyweight',
    'weighted-pull-ups': 'weighted_bodyweight',
    'wide-grip-pull-up': 'weighted_bodyweight',

    // The stack takes weight off rather than adding it.
    'machine-dips': 'assisted_bodyweight',

    // Listed as bodyweight, but the load is the whole movement.
    'man-maker': 'weight_reps',
    'wall-ball': 'weight_reps',
  })
);

const onlyMobility = (entry) =>
  entry.movementPattern.every((p) => p === 'Stretch' || p === 'Mobility');

function trackingTypeFor(entry) {
  const override = TRACKING_OVERRIDES.get(entry.slug);
  if (override) return override;
  if (isCardio(entry)) return 'distance_duration';
  if (onlyMobility(entry)) return 'duration';
  if (entry.equipment[0] === 'Bodyweight') return 'bodyweight_reps';
  return 'weight_reps';
}

function categoryFor(entry) {
  if (isCardio(entry)) return 'cardio';
  if (entry.movementPattern.includes('Plyometric')) return 'plyometrics';
  if (onlyMobility(entry)) return 'stretching';
  return 'strength';
}

function forceFor(entry) {
  if (entry.movementPattern.includes('Push')) return 'push';
  if (entry.movementPattern.includes('Pull')) return 'pull';
  return null;
}

const raw = JSON.parse(readFileSync(resolve(ROOT, METADATA_PATH), 'utf8'));
if (!Array.isArray(raw) || raw.length === 0) {
  throw new Error(`No exercises found at ${METADATA_PATH}`);
}

const seen = new Set();
const problems = [];

const exercises = raw
  .map((entry) => {
    if (!entry.slug) problems.push(`missing slug: ${entry.name}`);
    if (seen.has(entry.slug)) problems.push(`duplicate slug: ${entry.slug}`);
    seen.add(entry.slug);

    const level = entry.difficulty;
    const category = categoryFor(entry);
    const force = forceFor(entry);
    const trackingType = trackingTypeFor(entry);

    if (!LEVEL.has(level)) problems.push(`${entry.slug}: bad level "${level}"`);
    if (!CATEGORY.has(category)) problems.push(`${entry.slug}: bad category "${category}"`);
    if (force != null && !FORCE.has(force)) problems.push(`${entry.slug}: bad force "${force}"`);
    if (!TRACKING_TYPE.has(trackingType)) {
      problems.push(`${entry.slug}: bad tracking type "${trackingType}"`);
    }
    if (entry.equipment.length === 0) problems.push(`${entry.slug}: no equipment`);

    // Throws when a muscle has no home, which is what stops a browse group
    // from silently going empty.
    groupOf(entry);

    const mechanic = entry.movementPattern.includes('Isolation') ? 'isolation' : 'compound';
    if (!MECHANIC.has(mechanic)) problems.push(`${entry.slug}: bad mechanic "${mechanic}"`);

    return {
      id: uuidv5(entry.slug, NAMESPACE),
      sourceId: entry.slug,
      name: entry.name,
      force,
      level,
      mechanic,
      // Two of 412 list a second option; the row subtitle and the filter menu
      // both hold one value, so the first is the one that ships.
      equipment: entry.equipment[0].toLowerCase(),
      category,
      trackingType,
      primaryMuscles: entry.primaryMuscles.map((m) => m.toLowerCase()),
      secondaryMuscles: entry.secondaryMuscles.map((m) => m.toLowerCase()),
      tags: tagsFor(entry),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

for (const slug of TRACKING_OVERRIDES.keys()) {
  if (!seen.has(slug)) problems.push(`tracking override for unknown exercise "${slug}"`);
}

for (const slug of unknownAliasIds(seen)) {
  problems.push(`search alias for unknown exercise "${slug}"`);
}

// A template entry that resolves to nothing is dropped in silence at seed time
// (see seedTemplates in src/db/seed.ts), so it has to fail here instead.
for (const template of JSON.parse(readFileSync(TEMPLATES, 'utf8'))) {
  for (const { exerciseSourceId } of template.exercises) {
    if (!seen.has(exerciseSourceId)) {
      problems.push(`template "${template.sourceId}" references unknown "${exerciseSourceId}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} problem(s) in source data:`);
  for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(exercises, null, 2)}\n`);

const equipment = new Set(exercises.map((e) => e.equipment));
const muscles = new Set(exercises.flatMap((e) => e.primaryMuscles));
console.log(`Wrote ${exercises.length} exercises to ${OUT}`);
console.log(`  equipment types: ${[...equipment].sort().join(', ')}`);
console.log(`  primary muscles: ${[...muscles].sort().join(', ')}`);
for (const type of [...TRACKING_TYPE]) {
  console.log(`  ${type}: ${exercises.filter((e) => e.trackingType === type).length}`);
}
