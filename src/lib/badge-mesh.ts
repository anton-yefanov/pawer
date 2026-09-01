import { NUMERAL_POLYGONS, type Polygon } from '@/lib/badge-numerals';

/**
 * An achievement badge is a real solid, struck like a coin: a flat-top
 * hexagonal prism whose front carries a raised rim, a field dished *inwards*
 * from it, and the numeral standing in relief on that field, low enough that
 * the rim still protects it. This file builds that mesh and projects it, and
 * nothing here touches React or Skia — the badge is numbers until
 * `badge-canvas.tsx` fills the paths.
 *
 * The rim and the dish are the same idea with the sign flipped, and that is the
 * whole trick: a convex facet on the light side turns *towards* the light and a
 * concave one turns away, so the shading inverts as the surface crosses the rim
 * and the field reads as hollow without a gradient anywhere.
 *
 * The illusion is entirely in the normals: every facet is a flat fill, and what
 * makes it read as struck metal is that its shade is `n · light` for the normal
 * the rotation just gave it. So there is no texture, no gradient per facet, and
 * nothing to author per tier beyond two colours.
 *
 * Coordinates are y-up and z-toward-the-viewer with the outer hexagon at
 * radius 1; the projection flips y for the screen.
 */
export type Vec3 = readonly [number, number, number];

export type FaceKind = 'field' | 'dish' | 'rim' | 'wall' | 'mark';

type Face = { points: readonly Vec3[]; normal: Vec3; kind: FaceKind };
export type Mesh = { faces: readonly Face[] };

export type ProjectedFace = {
  /** Flattened screen points, `[x0, y0, x1, y1, …]`, centred on the origin. */
  points: number[];
  shade: number;
  spec: number;
  kind: FaceKind;
};

const OUTER = 1;
const BACK = -0.16;
/** Where the side wall stops and the rim starts climbing. */
const SHOULDER = 0.1;
const RIM_R = 0.9;
const RIM_Z = 0.25;
const SLOPE_R = 0.72;
const SLOPE_Z = 0.165;
const FIELD_R = 0.62;
const FIELD_Z = 0.125;
const MARK_Z = 0.205;
/** The numerals are authored full-width; the dished field they stand in is smaller. */
const MARK_SCALE = 0.79;
const DOME = 0.86;
const DOME_RISE = 0.05;

/** Upper-left and toward the viewer — the direction every shadow in the app falls from. */
const LIGHT = unit([-0.45, 0.62, 0.65]);
const HALF = unit([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
const AMBIENT = 0.22;
const SHININESS = 26;
/** Weak enough that a badge reads as an object on the page rather than a lens. */
const FOCAL = 5;

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function hexagon(radius: number): Polygon {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
}

/** Wall normals come from the winding, so a clockwise polygon would light inside out. */
function counterClockwise(polygon: Polygon): Polygon {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    area += x0 * y1 - x1 * y0;
  }
  return area < 0 ? [...polygon].reverse() : polygon;
}

/**
 * The one primitive: a cap, a floor and a wall per edge. Faces hidden inside
 * the badge are left out rather than drawn and covered — the body's cap sits
 * under the rim and a numeral's floor sits on the field.
 */
function extrude(
  input: Polygon,
  z0: number,
  z1: number,
  kind: FaceKind,
  { cap = true, floor = true }: { cap?: boolean; floor?: boolean } = {},
): Face[] {
  const polygon = counterClockwise(input);
  const faces: Face[] = [];

  if (cap) {
    faces.push({
      points: polygon.map(([x, y]) => [x, y, z1] as Vec3),
      normal: [0, 0, 1],
      kind,
    });
  }
  if (floor) {
    faces.push({
      points: [...polygon].reverse().map(([x, y]) => [x, y, z0] as Vec3),
      normal: [0, 0, -1],
      kind: 'wall',
    });
  }

  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    faces.push({
      points: [
        [x0, y0, z1],
        [x0, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
      ],
      normal: unit([y1 - y0, x0 - x1, 0]),
      kind: 'wall',
    });
  }

  return faces;
}

/** Six quads spanning two hexagons at different radii and depths. */
function ring(
  outerRadius: number,
  outerZ: number,
  innerRadius: number,
  innerZ: number,
  kind: FaceKind,
  facing: 1 | -1,
): Face[] {
  const outer = hexagon(outerRadius);
  const inner = hexagon(innerRadius);

  return outer.map((_, i) => {
    const next = (i + 1) % 6;
    const points: Vec3[] = [
      [outer[i][0], outer[i][1], outerZ],
      [outer[next][0], outer[next][1], outerZ],
      [inner[next][0], inner[next][1], innerZ],
      [inner[i][0], inner[i][1], innerZ],
    ];
    return { points, normal: faceNormal(points, facing), kind };
  });
}

/**
 * Which way a ring's facet looks. Pointing it away from the badge's centre
 * would be wrong for the dish, whose facets lean back *towards* the axis while
 * still facing the viewer — so the side of the badge it belongs to decides,
 * not the direction it leans.
 */
function faceNormal(points: readonly Vec3[], facing: 1 | -1): Vec3 {
  const [a, b, c] = points;
  const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = unit([
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]);
  return normal[2] * facing > 0 ? normal : [-normal[0], -normal[1], -normal[2]];
}

const meshes = new Map<string, Mesh>();

export function hexBadge(numeral: string): Mesh {
  const cached = meshes.get(numeral);
  if (cached) return cached;

  const marks = NUMERAL_POLYGONS[numeral] ?? NUMERAL_POLYGONS.I;
  const mesh: Mesh = {
    faces: [
      ...extrude(hexagon(OUTER), BACK, SHOULDER, 'wall', { cap: false, floor: false }),
      // The back is domed rather than a blank slab: it is on screen for a third
      // of every spin.
      ...ring(OUTER, BACK, DOME, BACK - DOME_RISE, 'wall', -1),
      {
        points: [...hexagon(DOME)].reverse().map(([x, y]) => [x, y, BACK - DOME_RISE] as Vec3),
        normal: [0, 0, -1],
        kind: 'wall',
      },
      ...ring(OUTER, SHOULDER, RIM_R, RIM_Z, 'rim', 1),
      ...ring(RIM_R, RIM_Z, SLOPE_R, SLOPE_Z, 'dish', 1),
      ...ring(SLOPE_R, SLOPE_Z, FIELD_R, FIELD_Z, 'dish', 1),
      {
        points: hexagon(FIELD_R).map(([x, y]) => [x, y, FIELD_Z] as Vec3),
        normal: [0, 0, 1],
        kind: 'field',
      },
      ...marks.flatMap((polygon) =>
        extrude(
          polygon.map(([x, y]) => [x * MARK_SCALE, y * MARK_SCALE] as const),
          FIELD_Z,
          MARK_Z,
          'mark',
          { floor: false },
        ),
      ),
    ],
  };

  meshes.set(numeral, mesh);
  return mesh;
}

/**
 * The badge first, the numeral on top of it. Everything in the first group is
 * ordered by depth, which is right for a dished surface — at a tilt the far rim
 * really does stand in front of the field behind it. The numeral is the one
 * thing depth gets wrong, because a bar on the far side has a lower mean z than
 * the wide field it is standing on and would be painted over by it.
 */
const LAYERS: Record<FaceKind, number> = {
  wall: 0,
  rim: 0,
  dish: 0,
  field: 0,
  mark: 1,
};

/**
 * Rotate, light, cull and order. Culling alone is exact for the body, which is
 * convex — nothing front-facing overlaps anything else front-facing. What the
 * numeral adds is a second solid standing in the field, and *that* is what the
 * order is for: sorting the whole set by depth gets it wrong, because a bar on
 * the far side of the badge has a lower mean z than the field it sits in and
 * would be painted over. So the layer decides, and depth only settles bars
 * against each other.
 */
export function projectBadge(mesh: Mesh, rx: number, ry: number, scale: number): ProjectedFace[] {
  'worklet';
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);

  const visible: { face: ProjectedFace; depth: number }[] = [];

  for (const face of mesh.faces) {
    const tilted = face.normal[1] * sx + face.normal[2] * cx;
    const nz = tilted * cy - face.normal[0] * sy;
    if (nz <= 0.001) continue;

    const nx = face.normal[0] * cy + tilted * sy;
    const ny = face.normal[1] * cx - face.normal[2] * sx;

    const diffuse = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
    const highlight = nx * HALF[0] + ny * HALF[1] + nz * HALF[2];

    const points: number[] = [];
    let depth = 0;
    for (const [x, y, z] of face.points) {
      const y1 = y * cx - z * sx;
      const z1 = y * sx + z * cx;
      const x2 = x * cy + z1 * sy;
      const z2 = z1 * cy - x * sy;
      const perspective = FOCAL / (FOCAL - z2);
      points.push(x2 * perspective * scale, -y1 * perspective * scale);
      depth += z2 / face.points.length;
    }

    visible.push({
      depth,
      face: {
        points,
        shade: AMBIENT + (1 - AMBIENT) * Math.max(0, diffuse),
        spec: Math.pow(Math.max(0, highlight), SHININESS),
        kind: face.kind,
      },
    });
  }

  visible.sort((a, b) => LAYERS[a.face.kind] - LAYERS[b.face.kind] || a.depth - b.depth);
  return visible.map((entry) => entry.face);
}

/**
 * The tilt a badge rests at: enough to show a wall and the rim's facets. The list
 * draws every badge here, and the spotlight returns to it on the way out, so a
 * dismissed badge lands exactly on the one it came from instead of ghosting
 * over it.
 */
export const REST_TILT = { rx: (-13 * Math.PI) / 180, ry: (17 * Math.PI) / 180 };

/** How wide the badge draws inside the square slot the caller gave it. */
export function badgeScale(size: number): number {
  'worklet';
  return size * 0.45;
}
