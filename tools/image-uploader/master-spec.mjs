/**
 * The master spec from assets/masters/README.md, as the checks the uploader
 * runs before a file is written into the store. Validation only — the deployed
 * functions import this, so it must not reach for anything on disk.
 */
import sharp from 'sharp';

export const MASTER_SIZE = 1200;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Throws a plain Error whose message is shown verbatim on the slot. */
export async function normalizeMaster(buf) {
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
  if (meta.width !== MASTER_SIZE) {
    warnings.push(
      `resized from ${meta.width}x${meta.width} to ${MASTER_SIZE}x${MASTER_SIZE}` +
        (meta.width < MASTER_SIZE
          ? ' — upscaled, so it will look softer than art drawn at full size'
          : ''),
    );
    out = await sharp(buf)
      .resize(MASTER_SIZE, MASTER_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
export async function boundingBoxDrift(png, sibling) {
  if (!sibling) return null;
  try {
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
    return null; // a fully transparent frame has no box to compare
  }
}
