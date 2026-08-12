#!/usr/bin/env node
/**
 * Builds the bundled exercise seed from a local checkout of
 * https://github.com/yuhonas/free-exercise-db (public domain).
 *
 *   node scripts/build-exercise-seed.mjs [path-to-free-exercise-db]
 *
 * Output: src/db/seed/exercises.json
 *
 * Exercise UUIDs are derived deterministically (UUIDv5) from the upstream slug,
 * so re-running this script after an upstream refresh keeps the same ids and
 * never orphans logged sets.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tagsFor, unknownAliasIds } from './exercise-tags.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(process.argv[2] ?? resolve(ROOT, '../free-exercise-db'));
const OUT = resolve(ROOT, 'src/db/seed/exercises.json');

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
const LEVEL = new Set(['beginner', 'intermediate', 'expert']);
const MECHANIC = new Set(['compound', 'isolation']);
const CATEGORY = new Set([
  'strength',
  'powerlifting',
  'cardio',
  'olympic weightlifting',
  'plyometrics',
  'stretching',
  'strongman',
]);

/**
 * Which fields a set logs. Upstream has no such field, so it is derived here —
 * see `src/lib/tracking-types.ts` for what each value renders.
 *
 * The rules cover the bulk; the overrides are the exercises where equipment and
 * category lie about how the movement is actually loaded. A loadable bodyweight
 * move gets `weighted_bodyweight` rather than `bodyweight_reps` because the
 * weight cell is optional either way, so it is strictly the more capable of the
 * two.
 */
const TRACKING_OVERRIDES = new Map(
  Object.entries({
    duration: ['Rope_Jumping', 'Battling_Ropes'],
    assisted_bodyweight: [
      'Band_Assisted_Pull-Up',
      'x_Assisted_Pull-Up_Machine',
      'x_Assisted_Chin-Up_Machine',
    ],
    weighted_bodyweight: [
      'Pullups',
      'Chin-Up',
      'Wide-Grip_Rear_Pull-Up',
      'Muscle_Up',
      'Dips_-_Triceps_Version',
      'Dips_-_Chest_Version',
      'Bench_Dips',
      'Ab_Roller',
      'Hanging_Leg_Raise',
      'Knee_Hip_Raise_On_Parallel_Bars',
      'Hyperextensions_Back_Extensions',
    ],
    bodyweight_reps: [
      'Inverted_Row',
      'Bodyweight_Walking_Lunge',
      'Mountain_Climbers',
      'Front_Box_Jump',
      'Lateral_Box_Jump',
    ],
  }).flatMap(([type, ids]) => ids.map((id) => [id, type]))
);

/**
 * Exercises upstream is missing, in the upstream record shape. Their ids are
 * namespaced with an `x_` prefix so an upstream slug can never collide with one.
 */
const ADDITIONS = [
  {
    id: 'x_Assisted_Pull-Up_Machine',
    name: 'Assisted Pull-Up (Machine)',
    force: 'pull',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'machine',
    category: 'strength',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'forearms', 'middle back', 'shoulders'],
    instructions: [
      'Set the assistance weight on the stack. More weight means more help, so a lighter setting is the harder one.',
      'Take a wide overhand grip on the bar and kneel or stand on the pad, letting it carry your weight. Keep your chest up and your torso close to vertical. This is your starting position.',
      'Pull yourself up by driving your elbows down and back until your chin clears the bar, squeezing the lats at the top.',
      'Lower yourself under control until your arms are fully extended, breathing in on the way down.',
      'Repeat for the prescribed amount of repetitions.',
    ],
  },
  {
    id: 'x_Assisted_Chin-Up_Machine',
    name: 'Assisted Chin-Up (Machine)',
    force: 'pull',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'machine',
    category: 'strength',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'forearms', 'middle back'],
    instructions: [
      'Set the assistance weight on the stack. More weight means more help, so a lighter setting is the harder one.',
      'Take an underhand grip slightly inside shoulder width and kneel or stand on the pad, letting it carry your weight. This is your starting position.',
      'Pull your torso up until your head reaches the level of the bar, concentrating on the biceps and keeping the elbows close to your body.',
      'Squeeze at the top, then lower yourself slowly until your arms are fully extended.',
      'Repeat for the prescribed amount of repetitions.',
    ],
  },
];

const TRACKING_TYPE = new Set([
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
]);

function trackingTypeFor(e) {
  const override = TRACKING_OVERRIDES.get(e.id);
  if (override) return override;
  if (e.category === 'cardio') return 'distance_duration';
  if (e.force === 'static') return 'duration';
  if (e.equipment === 'body only') return 'bodyweight_reps';
  return 'weight_reps';
}

const raw = JSON.parse(readFileSync(resolve(SOURCE, 'dist/exercises.json'), 'utf8'));
if (!Array.isArray(raw) || raw.length === 0) {
  throw new Error(`No exercises found at ${SOURCE}/dist/exercises.json`);
}

const seen = new Set();
const problems = [];

const exercises = [...raw, ...ADDITIONS]
  .map((e) => {
    if (!e.id) problems.push(`missing id: ${e.name}`);
    if (seen.has(e.id)) problems.push(`duplicate id: ${e.id}`);
    seen.add(e.id);
    if (e.force != null && !FORCE.has(e.force)) problems.push(`${e.id}: bad force "${e.force}"`);
    if (!LEVEL.has(e.level)) problems.push(`${e.id}: bad level "${e.level}"`);
    if (e.mechanic != null && !MECHANIC.has(e.mechanic)) {
      problems.push(`${e.id}: bad mechanic "${e.mechanic}"`);
    }
    if (!CATEGORY.has(e.category)) problems.push(`${e.id}: bad category "${e.category}"`);

    const trackingType = trackingTypeFor(e);
    if (!TRACKING_TYPE.has(trackingType)) {
      problems.push(`${e.id}: bad tracking type "${trackingType}"`);
    }

    return {
      id: uuidv5(e.id, NAMESPACE),
      sourceId: e.id,
      name: e.name,
      force: e.force ?? null,
      level: e.level,
      mechanic: e.mechanic ?? null,
      equipment: e.equipment ?? null,
      category: e.category,
      trackingType,
      primaryMuscles: e.primaryMuscles ?? [],
      secondaryMuscles: e.secondaryMuscles ?? [],
      instructions: e.instructions ?? [],
      tags: tagsFor(e),
      // `images` is deliberately dropped: upstream ships stock photos, we ship
      // our own mascot illustrations keyed by sourceId.
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

for (const id of TRACKING_OVERRIDES.keys()) {
  if (!seen.has(id)) problems.push(`tracking override for unknown exercise "${id}"`);
}

for (const id of unknownAliasIds(seen)) {
  problems.push(`search alias for unknown exercise "${id}"`);
}

if (problems.length > 0) {
  console.error(`${problems.length} problem(s) in source data:`);
  for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(exercises, null, 2)}\n`);

const equipment = new Set(exercises.map((e) => e.equipment ?? 'none'));
const muscles = new Set(exercises.flatMap((e) => e.primaryMuscles));
console.log(`Wrote ${exercises.length} exercises to ${OUT}`);
console.log(`  equipment types: ${[...equipment].sort().join(', ')}`);
console.log(`  primary muscles: ${[...muscles].sort().join(', ')}`);
for (const type of [...TRACKING_TYPE]) {
  console.log(`  ${type}: ${exercises.filter((e) => e.trackingType === type).length}`);
}
