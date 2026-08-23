import type { MuscleGroup } from '@/lib/muscle-groups';

/**
 * The figure is *made of* its muscle groups: there is no silhouette underneath,
 * so the gaps between plates are the definition lines. Anything the recovery
 * model doesn't track — neck, forearms, hands, pelvis, feet — is an inert plate,
 * which is what keeps a fully recovered body from reading as a blank.
 *
 * Limbs are tapered capsules struck between two points rather than hand-drawn
 * outlines, and every left-side plate is mirrored rather than written twice, so
 * the figure stays symmetrical and consistently weighted as it is tuned.
 * Proportions are the standard eight-head figure over this box's 260 units.
 */
export const BODY_VIEWBOX = { width: 120, height: 260 } as const;

export const HEAD = { cx: 60, cy: 20, rx: 11, ry: 13.5 } as const;

export type Point = readonly [number, number];
export type Plate = {
  group: MuscleGroup | null;
  points: readonly Point[];
  radius: number;
};
export type BodyView = 'front' | 'back';

const mirror = (points: readonly Point[]): Point[] =>
  points.map(([x, y]) => [BODY_VIEWBOX.width - x, y] as const);

/** A limb segment: an axis, a width at each end, and the rounding of its cap. */
function taper([ax, ay]: Point, [bx, by]: Point, widthA: number, widthB: number): readonly Point[] {
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / len;
  const ny = (bx - ax) / len;

  return [
    [ax + (nx * widthA) / 2, ay + (ny * widthA) / 2],
    [bx + (nx * widthB) / 2, by + (ny * widthB) / 2],
    [bx - (nx * widthB) / 2, by - (ny * widthB) / 2],
    [ax - (nx * widthA) / 2, ay - (ny * widthA) / 2],
  ];
}

const one = (group: MuscleGroup | null, points: readonly Point[], radius: number): Plate => ({
  group,
  points,
  radius,
});

const pair = (group: MuscleGroup | null, points: readonly Point[], radius: number): Plate[] => [
  { group, points, radius },
  { group, points: mirror(points), radius },
];

const NECK = one(
  null,
  [
    [54, 29],
    [66, 29],
    [67, 42],
    [53, 42],
  ],
  4,
);

const DELTOIDS = pair('shoulders', taper([34, 50], [33, 71], 21, 17), 8);
const UPPER_ARM = taper([32, 73], [29, 104], 17, 14);
const FOREARMS = pair(null, taper([29, 107], [25, 152], 13, 9), 5);
const THIGH = taper([50, 138], [47, 190], 21, 17);
const SHIN = taper([46, 193], [45, 242], 16, 10);

const SKELETON = [NECK, ...DELTOIDS, ...FOREARMS, ...pair('calves', SHIN, 7)];

const FRONT: Plate[] = [
  ...SKELETON,
  ...pair(
    'chest',
    [
      [58, 51],
      [46, 53],
      [46, 69],
      [58, 79],
    ],
    5,
  ),
  ...pair('biceps', UPPER_ARM, 6),
  one(
    'core',
    [
      [49, 83],
      [71, 83],
      [69, 99],
      [67, 113],
      [53, 113],
      [51, 99],
    ],
    5,
  ),
  one(
    null,
    [
      [51, 116],
      [69, 116],
      [74, 126],
      [71, 135],
      [49, 135],
      [46, 126],
    ],
    8,
  ),
  ...pair('quads', THIGH, 9),
];

const BACK: Plate[] = [
  ...SKELETON,
  one(
    'back',
    [
      [53, 42],
      [67, 42],
      [78, 55],
      [72, 61],
      [48, 61],
      [42, 55],
    ],
    5,
  ),
  one(
    'back',
    [
      [50, 62],
      [70, 62],
      [74, 72],
      [70, 92],
      [66, 112],
      [54, 112],
      [50, 92],
      [46, 72],
    ],
    7,
  ),
  ...pair('triceps', UPPER_ARM, 6),
  one(
    'hamstrings',
    [
      [51, 116],
      [69, 116],
      [76, 127],
      [72, 139],
      [48, 139],
      [44, 127],
    ],
    10,
  ),
  ...pair('hamstrings', taper([50, 142], [47, 190], 21, 17), 9),
];

export const BODY_PLATES: Record<BodyView, readonly Plate[]> = {
  front: FRONT,
  back: BACK,
};

/**
 * A rounded polygon: every corner becomes a quadratic curve whose control point
 * is the corner itself. One primitive for every plate is what keeps the figure
 * looking drawn by one hand rather than assembled.
 */
export function platePath(points: readonly Point[], radius: number): string {
  const count = points.length;
  let path = '';

  for (let i = 0; i < count; i++) {
    const [cx, cy] = points[i];
    const [px, py] = points[(i - 1 + count) % count];
    const [nx, ny] = points[(i + 1) % count];

    const toPrev = Math.hypot(px - cx, py - cy);
    const toNext = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, toPrev / 2, toNext / 2);

    const ax = cx + ((px - cx) / toPrev) * r;
    const ay = cy + ((py - cy) / toPrev) * r;
    const bx = cx + ((nx - cx) / toNext) * r;
    const by = cy + ((ny - cy) / toNext) * r;

    path += `${i === 0 ? 'M' : 'L'}${ax.toFixed(2)},${ay.toFixed(2)}Q${cx.toFixed(2)},${cy.toFixed(2)} ${bx.toFixed(2)},${by.toFixed(2)}`;
  }

  return `${path}Z`;
}
