/**
 * The flat-top hexagon the achievement badges are cut from, reused as the frame
 * every piece of exercise art is drawn in. Vertices sit at 0°, 60°, ... so the
 * silhouette is a point on either side and a flat edge top and bottom — the
 * same winding `badge-mesh.ts` extrudes.
 */
export const HEX_ASPECT = Math.sqrt(3) / 2;

/** Corner rounding, as a fraction of the hexagon's width. */
export const HEX_CORNER_SCALE = 0.075;

type Point = readonly [number, number];

function vertices(width: number): Point[] {
  const r = width / 2;
  const cy = (width * HEX_ASPECT) / 2;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3;
    return [r + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  });
}

function towards(from: Point, to: Point, distance: number): Point {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  const t = Math.min(distance / length, 0.5);
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

/** An SVG path for a hexagon of `width`, its corners cut back and curved. */
export function hexagonPath(width: number, radius = width * HEX_CORNER_SCALE) {
  const points = vertices(width);
  const segments = points.map((point, i) => {
    const previous = points[(i + 5) % 6];
    const next = points[(i + 1) % 6];
    const [ax, ay] = towards(point, previous, radius);
    const [bx, by] = towards(point, next, radius);
    return `${i === 0 ? "M" : "L"}${ax} ${ay}Q${point[0]} ${point[1]} ${bx} ${by}`;
  });
  return `${segments.join("")}Z`;
}
