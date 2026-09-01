import {
  BlurStyle,
  Canvas,
  ClipOp,
  PaintStyle,
  Picture,
  Skia,
  TileMode,
  type SkCanvas,
  type SkPath,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { finishFor, type BadgeMaterial } from '@/lib/badge-material';
import {
  badgeScale,
  hexBadge,
  projectBadge,
  REST_TILT,
  type FaceKind,
  type Mesh,
} from '@/lib/badge-mesh';

export type BadgeFace = {
  numeral: string;
  material: BadgeMaterial;
  /** Left out of the picture while the spotlight has it, so the slot reads empty. */
  hidden?: boolean;
};

/**
 * How hard each part of the coin takes a highlight. The rim is polished and the
 * dished field deliberately is not: a specular blowout in the hollow washes out
 * the very shading that makes it read hollow.
 */
/**
 * The contact shadow falls below the badge and blurs well past it, so the
 * canvas is taller than the slot it fills. Nothing clips it — the badge is
 * still drawn on the slot's centre line, and the extra height hangs into the
 * gap above the caption.
 */
const BLEED = 0.25;

const GLINT: Record<FaceKind, number> = {
  rim: 0.8,
  mark: 0.7,
  wall: 0.5,
  dish: 0.22,
  field: 0.22,
};

function faceColor(material: BadgeMaterial, kind: FaceKind, shade: number, spec: number) {
  'worklet';
  const { dark, light } = finishFor(material, kind);
  const highlight = material.spec;
  return new Float32Array([
    Math.min(1, dark[0] + (light[0] - dark[0]) * shade + highlight[0] * spec),
    Math.min(1, dark[1] + (light[1] - dark[1]) * shade + highlight[1] * spec),
    Math.min(1, dark[2] + (light[2] - dark[2]) * shade + highlight[2] * spec),
    1,
  ]);
}

/**
 * One badge, drawn at `dx` inside whatever canvas is recording. Every facet is
 * a flat fill and then a hairline stroke of the same colour — adjacent
 * antialiased paths otherwise leave a seam of background between them, which
 * on a hexagon reads as a crack rather than an edge.
 */
export function paintBadge(
  canvas: SkCanvas,
  mesh: Mesh,
  material: BadgeMaterial,
  rx: number,
  ry: number,
  size: number,
  dx: number,
) {
  'worklet';
  const faces = projectBadge(mesh, rx, ry, badgeScale(size));
  const cx = dx + size / 2;
  const cy = size / 2;
  const struck = material.gloss > 0.2;

  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  if (struck) {
    paint.setColor(new Float32Array([0, 0, 0, 0.09]));
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, size * 0.07, false));
    canvas.drawOval(
      Skia.XYWHRect(cx - size * 0.34, cy + size * 0.435, size * 0.68, size * 0.055),
      paint,
    );
    paint.setMaskFilter(null);
  }

  let field: SkPath | null = null;

  for (const face of faces) {
    const path = Skia.Path.Make();
    path.moveTo(cx + face.points[0], cy + face.points[1]);
    for (let i = 2; i < face.points.length; i += 2) {
      path.lineTo(cx + face.points[i], cy + face.points[i + 1]);
    }
    path.close();

    const glint = face.spec * material.gloss * GLINT[face.kind];
    paint.setColor(faceColor(material, face.kind, face.shade, glint));
    paint.setStyle(PaintStyle.Fill);
    canvas.drawPath(path, paint);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(0.7);
    canvas.drawPath(path, paint);

    if (face.kind === 'field') field = path;
  }

  if (field != null && struck) {
    const bounds = field.getBounds();
    const sheen = Skia.Paint();
    sheen.setShader(
      Skia.Shader.MakeLinearGradient(
        Skia.Point(bounds.x, bounds.y),
        Skia.Point(bounds.x + bounds.width, bounds.y + bounds.height),
        [
          new Float32Array([1, 1, 1, 0.22]),
          new Float32Array([1, 1, 1, 0]),
          new Float32Array([1, 1, 1, 0.07]),
        ],
        [0, 0.58, 1],
        TileMode.Clamp,
      ),
    );
    canvas.save();
    canvas.clipPath(field, ClipOp.Intersect, true);
    canvas.drawPaint(sheen);
    canvas.restore();
  }
}

/**
 * A row of badges in **one** canvas. An exercise can show fifteen of them, and
 * a Skia view per badge is what would make this scroll worse than the flat
 * discs it replaces; the row is recorded once and never redrawn.
 */
export function BadgeRow({
  faces,
  size,
  gap,
}: {
  faces: readonly BadgeFace[];
  size: number;
  gap: number;
}) {
  const width = size * faces.length + gap * (faces.length - 1);

  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, size * (1 + BLEED)));
    faces.forEach((face, index) => {
      if (face.hidden) return;
      paintBadge(
        canvas,
        hexBadge(face.numeral),
        face.material,
        REST_TILT.rx,
        REST_TILT.ry,
        size,
        index * (size + gap),
      );
    });
    return recorder.finishRecordingAsPicture();
  }, [faces, gap, size, width]);

  return (
    <Canvas style={[styles.row, { width, height: size * (1 + BLEED) }]} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
}

/** The same badge with its rotation on the UI thread, for the spotlight. */
export function SpinnableBadge({
  numeral,
  material,
  size,
  rx,
  ry,
}: {
  numeral: string;
  material: BadgeMaterial;
  size: number;
  rx: SharedValue<number>;
  ry: SharedValue<number>;
}) {
  const mesh = useMemo(() => hexBadge(numeral), [numeral]);

  const picture = useDerivedValue(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, size, size * (1 + BLEED)));
    paintBadge(canvas, mesh, material, rx.value, ry.value, size, 0);
    return recorder.finishRecordingAsPicture();
  }, [material, mesh, size]);

  return (
    <Canvas style={{ width: size, height: size * (1 + BLEED) }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
