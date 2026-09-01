/**
 * The Roman numerals I–V as flat polygons in the badge's plate space, ready to
 * be extruded by `badge-mesh.ts` into a raised mark.
 *
 * Hand-authored rather than taken from a font: Skia needs a bundled `.ttf` to
 * lay out text at all, and a glyph outline could not be given walls that catch
 * the light as the badge turns. Five numerals of bars and parallelograms is the
 * cheaper end of that trade.
 */
export type Polygon = readonly (readonly [number, number])[];

const THICKNESS = 0.15;
const TOP = 0.34;

function bar(cx: number): Polygon {
  const half = THICKNESS / 2;
  return [
    [cx - half, -TOP],
    [cx + half, -TOP],
    [cx + half, TOP],
    [cx - half, TOP],
  ];
}

/** Two strokes meeting at an apex on the baseline. */
function vee(cx: number, halfWidth: number): readonly Polygon[] {
  const t = THICKNESS;
  return [
    [
      [cx - halfWidth, TOP],
      [cx - halfWidth + t, TOP],
      [cx + t / 2, -TOP],
      [cx - t / 2, -TOP],
    ],
    [
      [cx + halfWidth - t, TOP],
      [cx + halfWidth, TOP],
      [cx + t / 2, -TOP],
      [cx - t / 2, -TOP],
    ],
  ];
}

export const NUMERAL_POLYGONS: Record<string, readonly Polygon[]> = {
  I: [bar(0)],
  II: [bar(-0.13), bar(0.13)],
  III: [bar(-0.24), bar(0), bar(0.24)],
  IV: [bar(-0.36), ...vee(0.12, 0.3)],
  V: vee(0, 0.34),
};
