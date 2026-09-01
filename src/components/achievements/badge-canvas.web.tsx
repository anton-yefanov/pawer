import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { toHex, type BadgeMaterial } from '@/lib/badge-material';

export type BadgeFace = { numeral: string; material: BadgeMaterial };

/**
 * Skia draws the real badge; on web it would need a CanvasKit build that this
 * project doesn't ship, so here the same hexagon is flat SVG with the metal's
 * two colours as a gradient. Same silhouette, no mesh.
 */
const POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (i * Math.PI) / 3;
  return [50 + Math.cos(angle) * 46, 50 - Math.sin(angle) * 46];
})
  .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
  .join(' ');

function Badge({ numeral, material, size }: BadgeFace & { size: number }) {
  const id = `badge-${toHex(material.face.dark).slice(1)}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={toHex(material.face.light)} />
            <Stop offset="1" stopColor={toHex(material.face.dark)} />
          </LinearGradient>
        </Defs>
        <Polygon points={POINTS} fill={`url(#${id})`} />
      </Svg>
      <View style={styles.numeral}>
        <ThemedText type="title3" weight="bold" style={{ color: toHex(material.mark.light) }}>
          {numeral}
        </ThemedText>
      </View>
    </View>
  );
}

export function BadgeRow({
  faces,
  size,
  gap,
}: {
  faces: readonly BadgeFace[];
  size: number;
  gap: number;
}) {
  return (
    <View style={[styles.row, { gap }]}>
      {faces.map((face, index) => (
        <Badge key={index} numeral={face.numeral} material={face.material} size={size} />
      ))}
    </View>
  );
}

export function SpinnableBadge({
  numeral,
  material,
  size,
}: {
  numeral: string;
  material: BadgeMaterial;
  size: number;
  rx: SharedValue<number>;
  ry: SharedValue<number>;
}) {
  return <Badge numeral={numeral} material={material} size={size} />;
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
  },
  numeral: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
