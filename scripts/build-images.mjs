#!/usr/bin/env node
/**
 * Master → shipped-asset image pipeline (IMPLEMENTATION_PLAN.md §5.1).
 *
 *   node scripts/build-images.mjs
 *
 * Input  assets/masters/exercises/<slug>_1.png   1200x1200, PNG, alpha
 *        assets/masters/exercises/<slug>_2.png   same bounding box as _1
 *        assets/masters/mascot/<state>.png       1024x1024, PNG, alpha
 *        assets/masters/attributes/<kind>/<slug>.png  1024x1024, PNG, alpha
 *
 * Output assets/exercises/detail/<slug>_1.webp   600x600  q85 + alpha
 *        assets/exercises/detail/<slug>_2.webp   600x600
 *        assets/exercises/thumb/<slug>.webp      150x150  (from frame 1)
 *        src/lib/exercise-image-map.ts             the require map screens read
 *        assets/mascot/<state>.webp              512x512
 *        assets/attributes/<kind>/<slug>.webp    256x256
 *
 * Everything ships as lossy WebP q85 with a lossless alpha channel: ~half the
 * size of optimised PNG, natively decoded by expo-image, and unlike JPEG it
 * keeps transparency and does not smear crisp outlines.
 *
 * Resizing the detail view later is a re-run of this script, never a recrop.
 */
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { ATTRIBUTE_VALUES, attributeSlug } from './attribute-vocabulary.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const WEBP = { quality: 85, alphaQuality: 100, effort: 6 };

const SIZES = {
  detail: 600,
  thumb: 150,
  mascot: 512,
  attribute: 256,
};

/** Masters must all be square so thumb and detail share one bounding box. */
const MASTER_SIZE = { exercises: 1200, mascot: 1024, attributes: 1024 };

function listPngs(dir) {
  try {
    if (!statSync(dir).isDirectory()) return [];
  } catch {
    return [];
  }
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();
}

async function toWebp(input, output, size) {
  mkdirSync(dirname(output), { recursive: true });
  const buf = await sharp(input)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp(WEBP)
    .toBuffer();
  writeFileSync(output, buf);
  return buf.length;
}

async function checkSquare(file, expected, warnings) {
  const { width, height } = await sharp(file).metadata();
  if (width !== height) {
    warnings.push(`${basename(file)}: ${width}x${height} is not square — thumb crop will drift`);
  } else if (width !== expected) {
    warnings.push(`${basename(file)}: ${width}px master, expected ${expected}px`);
  }
}

const warnings = [];
let bytes = 0;
let count = 0;

// --- Exercises -------------------------------------------------------------
const exerciseMasters = resolve(ROOT, 'assets/masters/exercises');
const frames = listPngs(exerciseMasters);

for (const file of frames) {
  const src = resolve(exerciseMasters, file);
  const name = basename(file, '.png');
  if (!/_[12]$/.test(name)) {
    warnings.push(`${file}: expected a _1 / _2 frame suffix, skipped`);
    continue;
  }
  await checkSquare(src, MASTER_SIZE.exercises, warnings);

  bytes += await toWebp(src, resolve(ROOT, `assets/exercises/detail/${name}.webp`), SIZES.detail);
  count++;

  if (name.endsWith('_1')) {
    const slug = name.slice(0, -2);
    bytes += await toWebp(src, resolve(ROOT, `assets/exercises/thumb/${slug}.webp`), SIZES.thumb);
    count++;
  }
}

// Every _1 needs a matching _2 or the cross-fade has nothing to fade to.
const slugs = new Set(frames.map((f) => basename(f, '.png').replace(/_[12]$/, '')));
for (const slug of slugs) {
  for (const frame of ['_1', '_2']) {
    if (!frames.includes(`${slug}${frame}.png`)) {
      warnings.push(`${slug}: missing frame ${slug}${frame}.png`);
    }
  }
}

writeExerciseImageMap(slugs);

// --- Mascot ----------------------------------------------------------------
const mascotMasters = resolve(ROOT, 'assets/masters/mascot');
for (const file of listPngs(mascotMasters)) {
  const src = resolve(mascotMasters, file);
  await checkSquare(src, MASTER_SIZE.mascot, warnings);
  bytes += await toWebp(src, resolve(ROOT, `assets/mascot/${basename(file, '.png')}.webp`), SIZES.mascot);
  count++;
}

// --- Attributes ------------------------------------------------------------
for (const [kind, values] of Object.entries(ATTRIBUTE_VALUES)) {
  const dir = resolve(ROOT, `assets/masters/attributes/${kind}`);
  const files = listPngs(dir);
  const expected = new Set(values.map(attributeSlug));

  for (const file of files) {
    const slug = basename(file, '.png');
    if (!expected.has(slug)) {
      warnings.push(`attributes/${kind}/${file}: not a ${kind} value in the seed, skipped`);
      continue;
    }
    const src = resolve(dir, file);
    await checkSquare(src, MASTER_SIZE.attributes, warnings);
    bytes += await toWebp(
      src,
      resolve(ROOT, `assets/attributes/${kind}/${slug}.webp`),
      SIZES.attribute,
    );
    count++;
  }

  for (const slug of expected) {
    if (!files.includes(`${slug}.png`)) {
      warnings.push(`attributes/${kind}: missing ${slug}.png`);
    }
  }
}

console.log(`Wrote ${count} WebP files, ${(bytes / 1024).toFixed(1)} KB total`);
if (warnings.length > 0) {
  console.warn(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}

/**
 * Metro only resolves static `require` literals, so the slug -> asset lookup has
 * to be written out. It is emitted here, from the frames that actually built.
 */
function writeExerciseImageMap(slugs) {
  const asset = (path) => `require('@/assets/exercises/${path}')`;

  const rows = [...slugs]
    .filter((slug) => slug !== 'placeholder' && frames.includes(`${slug}_1.png`))
    .sort()
    .map((slug) => {
      const pair = ['_1', '_2']
        .map((f) => (frames.includes(`${slug}${f}.png`) ? asset(`detail/${slug}${f}.webp`) : 'null'))
        .join(', ');
      return [
        `  '${slug}': {`,
        `    thumb: ${asset(`thumb/${slug}.webp`)},`,
        `    frames: [${pair}],`,
        '  },',
      ].join('\n');
    });

  const file = `import type { ImageSource } from 'expo-image';

// Generated by scripts/build-images.mjs from assets/masters/exercises — do not edit.

export type ExerciseArt = {
  thumb: ImageSource;
  frames: readonly [ImageSource | null, ImageSource | null];
};

export const EXERCISE_ART: Record<string, ExerciseArt> = {
${rows.join('\n')}
};
`;
  writeFileSync(resolve(ROOT, 'src/lib/exercise-image-map.ts'), file);
}
