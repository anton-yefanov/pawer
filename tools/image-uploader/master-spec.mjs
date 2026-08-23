/**
 * The master spec from assets/masters/README.md, as the checks the uploader
 * runs before a file is written into assets/masters/.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { ATTRIBUTE_VALUES, attributeSlug } from '../../scripts/attribute-vocabulary.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const MASTERS = resolve(ROOT, 'assets/masters');
export const MASTER_SIZE = 1200;
export const ATTRIBUTE_MASTER_SIZE = 1024;

export const masterPath = (sourceId, frame) =>
  resolve(MASTERS, `exercises/${sourceId}_${frame}.png`);
export const attributePath = (kind, slug) => resolve(MASTERS, `attributes/${kind}/${slug}.png`);

/** kind -> slug -> value, so a request can only address a value from the seed. */
export const attributesByKind = new Map(
  Object.entries(ATTRIBUTE_VALUES).map(([kind, values]) => [
    kind,
    new Map(values.map((value) => [attributeSlug(value), value])),
  ]),
);

export { ATTRIBUTE_VALUES, attributeSlug };

export const exercises = JSON.parse(
  await readFile(resolve(ROOT, 'src/db/seed/exercises.json'), 'utf8'),
).map(
  ({ sourceId, name, category, equipment, force, level, mechanic, primaryMuscles, secondaryMuscles, instructions }) => ({
    sourceId,
    name,
    category,
    equipment,
    muscle: primaryMuscles[0] ?? null,
    force,
    level,
    mechanic,
    primaryMuscles,
    secondaryMuscles,
    instructions,
  }),
);

export const byId = new Map(exercises.map((e) => [e.sourceId, e]));

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Throws a plain Error whose message is shown verbatim on the slot. */
export async function normalizeMaster(buf, size = MASTER_SIZE) {
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('not a PNG — masters must be PNG with a transparent background');
  }
  const meta = await sharp(buf).metadata();
  if (meta.format !== 'png') throw new Error(`${meta.format} is not PNG`);
  if (meta.width !== meta.height) {
    throw new Error(`${meta.width}x${meta.height} is not square — masters must be a square canvas`);
  }
  if (!meta.hasAlpha) throw new Error('no alpha channel — the background must be transparent');

  const warnings = [];
  // An alpha channel that is fully opaque passes the check above but is still a
  // flat background — the usual sign of art exported over white.
  if ((await sharp(buf).stats()).isOpaque) {
    warnings.push('every pixel is opaque — the background should be transparent, not filled');
  }

  let out = buf;
  if (meta.width !== size) {
    warnings.push(
      `resized from ${meta.width}x${meta.width} to ${size}x${size}` +
        (meta.width < size ? ' — upscaled, so it will look softer than art drawn at full size' : ''),
    );
    out = await sharp(buf)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
  return { png: out, warnings };
}

/** Tight box around the non-transparent pixels, as a fraction of the canvas. */
async function alphaBox(buf) {
  const { info } = await sharp(buf).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
  return {
    left: info.trimOffsetLeft === undefined ? 0 : -info.trimOffsetLeft,
    top: info.trimOffsetTop === undefined ? 0 : -info.trimOffsetTop,
    width: info.width,
    height: info.height,
  };
}

/**
 * The one rule from assets/masters/README.md that a machine can actually check:
 * both frames must sit in the same bounding box, or toggling reads as a glitch
 * rather than a rep.
 */
export async function boundingBoxDrift(png, siblingFile) {
  try {
    const sibling = await readFile(siblingFile);
    const [a, b] = await Promise.all([alphaBox(png), alphaBox(sibling)]);
    const drift = Math.max(
      Math.abs(a.left - b.left),
      Math.abs(a.top - b.top),
      Math.abs(a.left + a.width - (b.left + b.width)),
      Math.abs(a.top + a.height - (b.top + b.height)),
    );
    const tolerance = MASTER_SIZE * 0.02;
    if (drift <= tolerance) return null;
    return `art sits ${Math.round(drift)}px off the other frame's bounding box — lock the hips to a fixed point so toggling reads as a rep, not a jump`;
  } catch {
    return null; // no sibling yet, or a fully transparent frame with no box to compare
  }
}
