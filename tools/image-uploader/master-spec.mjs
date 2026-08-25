/**
 * The master spec from assets/masters/README.md, as the checks the uploader
 * runs before a file is written into the store. Validation only — the deployed
 * functions import this, so it must not reach for anything on disk.
 *
 * An upload keeps whatever aspect ratio it arrives in; the square the app ships
 * is `renderSquare()` of a crop over it, so reframing never re-encodes a square.
 */
import sharp from 'sharp';

export const MASTER_SIZE = 1200;
const SOURCE_MAX = 2400;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Throws a plain Error whose message is shown verbatim on the slot. */
export async function normalizeSource(buf) {
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('not a PNG — masters must be PNG');
  const meta = await sharp(buf).metadata();
  if (meta.format !== 'png') throw new Error(`${meta.format} is not PNG`);

  const warnings = [];
  let png = buf;
  let { width, height } = meta;
  const longest = Math.max(width, height);
  if (longest > SOURCE_MAX) {
    const scale = SOURCE_MAX / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    warnings.push(`resized from ${meta.width}x${meta.height} to ${width}x${height}`);
    png = await sharp(buf).resize(width, height).png().toBuffer();
  } else if (longest < MASTER_SIZE) {
    warnings.push(
      `${width}x${height} is smaller than ${MASTER_SIZE}px — the square will be upscaled and look soft`,
    );
  }
  return { png, width, height, warnings };
}

/** The whole image, squared off around its centre. */
export function centredCrop(width, height) {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

/**
 * A crop may hang off the edge of the source — that is what zooming out looks
 * like — so the source is padded before the square is cut out of it.
 */
export async function renderSquare(source, crop) {
  const { width, height } = await sharp(source).metadata();
  const x = Math.round(crop.x);
  const y = Math.round(crop.y);
  const size = Math.max(1, Math.round(crop.size));

  const pad = {
    left: Math.max(0, -x),
    top: Math.max(0, -y),
    right: Math.max(0, x + size - width),
    bottom: Math.max(0, y + size - height),
  };
  const padded =
    pad.left || pad.top || pad.right || pad.bottom
      ? await sharp(source)
          .extend({ ...pad, background: TRANSPARENT })
          .png()
          .toBuffer()
      : source;

  return sharp(padded)
    .extract({ left: x + pad.left, top: y + pad.top, width: size, height: size })
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: 'fill' })
    .png()
    .toBuffer();
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
