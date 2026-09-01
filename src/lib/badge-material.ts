import type { BadgeMaterialColors } from '@/constants/achievement-tiers';
import type { FaceKind } from '@/lib/badge-mesh';

/**
 * What a badge is struck from. Every artistic decision about colour lives here
 * and nowhere else: `badge-canvas.tsx` only mixes between the two ends of
 * whichever finish a facet asked for.
 *
 * A finish is that pair — the metal turned away from the light and the metal
 * facing it. Four of them, because the parts of the badge are not the same
 * metal: the rim is a deeper strike so it reads as a rim at every angle, the
 * walls are deeper still, and the numeral is always brighter than the dished
 * field it stands in so it never disappears into it.
 */
export type RGB = readonly [number, number, number];
export type Finish = { dark: RGB; light: RGB };

export type BadgeMaterial = {
  face: Finish;
  rim: Finish;
  edge: Finish;
  mark: Finish;
  spec: RGB;
  gloss: number;
};

export function finishFor(material: BadgeMaterial, kind: FaceKind): Finish {
  'worklet';
  if (kind === 'mark') return material.mark;
  if (kind === 'rim') return material.rim;
  if (kind === 'wall') return material.edge;
  return material.face;
}

const cache = new Map<string, BadgeMaterial>();

/** Cached so a row's badges keep their identity and its picture is recorded once. */
export function struckMaterial(key: string, colors: BadgeMaterialColors): BadgeMaterial {
  const cached = cache.get(key);
  if (cached) return cached;

  const dark = rgb(colors.dark);
  const light = rgb(colors.light);
  const spec = rgb(colors.spec);
  const material: BadgeMaterial = {
    face: { dark, light },
    rim: { dark: scale(dark, 0.78), light: scale(light, 0.84) },
    edge: { dark: scale(dark, 0.9), light: scale(light, 0.9) },
    mark: { dark: mix(dark, spec, 0.55), light: spec },
    spec,
    gloss: colors.gloss,
  };

  cache.set(key, material);
  return material;
}

/**
 * A locked badge is the same solid struck in nothing: two theme greys ordered
 * by brightness so it holds in either scheme, no highlight, and a numeral
 * *darker* than its field — engraved rather than raised, which is as close as
 * grey gets to saying "not yet".
 */
export function lockedMaterial(theme: {
  backgroundElement: string;
  textTertiary: string;
}): BadgeMaterial {
  const cached = cache.get(theme.backgroundElement);
  if (cached) return cached;

  const a = rgb(theme.backgroundElement);
  const b = rgb(theme.textTertiary);
  const [deep, pale] = luminance(a) < luminance(b) ? [a, b] : [b, a];
  const material: BadgeMaterial = {
    face: { dark: mix(deep, pale, 0.3), light: pale },
    rim: { dark: mix(deep, pale, 0.1), light: mix(deep, pale, 0.75) },
    edge: { dark: deep, light: mix(deep, pale, 0.6) },
    mark: { dark: deep, light: mix(deep, pale, 0.35) },
    spec: pale,
    gloss: 0.08,
  };

  cache.set(theme.backgroundElement, material);
  return material;
}

/** For the web fallback, which draws flat SVG rather than a mesh. */
export function toHex([r, g, b]: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((channel) =>
        Math.round(Math.max(0, Math.min(1, channel)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function rgb(hex: string): RGB {
  const value = parseInt(hex.replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function luminance([r, g, b]: RGB): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Multiplicative, so a deeper strike keeps the metal's hue. */
function scale([r, g, b]: RGB, k: number): RGB {
  return [r * k, g * k, b * k];
}
