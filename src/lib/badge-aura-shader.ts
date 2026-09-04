import { Skia } from '@shopify/react-native-skia';

import type { BadgeMaterial, RGB } from '@/lib/badge-material';

/** Multiples of the badge size: how far the light reaches. */
export const AURA_SPAN = 2.9;

/**
 * The light a spotlit badge stands in — a halo in the metal's lit colour and a
 * fan of beams in a deeper strike of the same hue, both slowly drifting.
 *
 * One SkSL program draws both, on a canvas bounded to the badge's neighbourhood
 * rather than the whole overlay: a fragment shader is cheap per pixel and
 * expensive per screen, and nothing this soft needs the corners.
 *
 * The beams are hard-edged wedges struck from the centre — eleven of them, each
 * a constant angle wide so it widens with distance the way a real shaft does,
 * with only enough softness on the sides to antialias them. They are not a
 * blurred sine field: a soft ray is a smudge, and the whole point is that the
 * light has shape. Lengths and widths come off a hash of the wedge's index, so
 * the fan is irregular rather than a cog, and each length breathes on its own
 * phase while the fan itself turns. Every wedge starts under the badge and
 * fades out over its last quarter, so they read as light escaping from behind
 * the hexagon rather than a pattern it happens to sit on.
 *
 * It is drawn over the blurred backdrop, not under it, which is what sets the
 * colours: the metal's own lit colour rather than anything mixed toward the
 * specular white, and carried at an alpha that holds. A pale halo on a frosted
 * near-white sheet is indistinguishable from the sheet, and reads as if the
 * glass were on top of it.
 *
 * `reveal` is the spotlight's own lift progress, which is what makes the two
 * animations free: forward on open, backward on close, always in step with the
 * badge and the blur. It grows the whole figure outward and swings the beams a
 * little as they extend, so the light arrives rather than switching on.
 *
 * The share card draws the same program into an offscreen surface, which is the
 * only reason it lives here rather than beside the component: a card whose
 * light did not match the screen it was taken from would be a different badge.
 */
export const AURA_SOURCE = Skia.RuntimeEffect.Make(`
const float TAU = 6.2831853;
const float COUNT = 11.0;

uniform float2 c;
uniform float r;
uniform float t;
uniform float reveal;
uniform float3 glow;
uniform float3 beam;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

half4 main(float2 xy) {
  float2 d = xy - c;
  float a = atan(d.y, d.x);
  float rd = length(d) / (r * mix(0.42, 1.0, reveal));

  float halo = pow(clamp(1.0 - rd, 0.0, 1.0), 2.4) * 0.72;

  // Indexed modulo COUNT so the wedge straddling atan's seam at ±π is the same
  // wedge on both sides of it, however far the fan has turned.
  float k = (a / TAU + 0.5 + t * 0.035 + (1.0 - reveal) * 0.22) * COUNT;
  float slot = mod(floor(k), COUNT);
  float off = fract(k) - 0.5;

  float len = mix(0.52, 0.94, hash(slot * 12.9898));
  len *= 0.86 + 0.14 * sin(t * 0.33 + slot);
  float width = mix(0.15, 0.27, hash(slot * 78.233));

  float edge = 1.0 - smoothstep(width - 0.03, width, abs(off));
  float span = smoothstep(0.03, 0.16, rd) * (1.0 - smoothstep(len * 0.72, len, rd));
  float beams = edge * span * 0.34;

  float alpha = clamp((halo + beams) * reveal, 0.0, 1.0);
  float3 tint = (glow * halo + beam * beams) / max(halo + beams, 0.0001);
  return half4(half3(tint * alpha), half(alpha));
}
`);

/** The two colours the fan is struck in, both mixed off the metal's own face. */
export function auraColors(material: BadgeMaterial): { glow: number[]; beam: number[] } {
  return {
    glow: mix(material.face.light, material.face.dark, 0.12),
    beam: mix(material.face.dark, material.face.light, 0.55),
  };
}

function mix(a: RGB, b: RGB, t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
