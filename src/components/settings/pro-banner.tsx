import { MeshGradientView } from 'expo-mesh-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import * as haptics from '@/lib/haptics';

const BANNER_HEIGHT = 148;

/**
 * The banner's own mesh, not a card cover: the covers are eight pastel hues a
 * user picks between, and this is one fixed piece of artwork that has to stay
 * dark enough for white type at any size.
 *
 * The points pull the middle row down the left edge and the middle column past
 * centre, which is what turns the blend into a diagonal streak rather than a
 * cross. Below iOS 18 the mesh draws nothing, so `FLAT` is the whole banner.
 */
const FLAT = '#241056';

const COLORS = [
  '#08061F', '#120B33', '#182A5E',
  '#2A0F5E', '#6B2FB0', '#CBD6F5',
  '#170B33', '#7A2CA6', '#1C7CC4',
];

const BASE_POINTS: number[][] = [
  [0, 0],
  [0.55, 0],
  [1, 0],
  [0, 0.42],
  [0.38, 0.62],
  [1, 0.34],
  [0, 1],
  [0.32, 1],
  [1, 1],
];

/**
 * How far each vertex wanders and over how long, in seconds. The four corners
 * are pinned and each edge vertex may only slide *along* its own edge — a mesh
 * whose boundary leaves the rectangle stops filling it, and the banner shows a
 * washed-out wedge in the corner. Only the centre moves in both axes.
 *
 * The periods are mutually prime enough that the drift never visibly loops.
 */
const DRIFT: { x: number; y: number; period: number }[] = [
  { x: 0, y: 0, period: 0 },
  { x: 0.13, y: 0, period: 29 },
  { x: 0, y: 0, period: 0 },
  { x: 0, y: 0.14, period: 37 },
  { x: 0.16, y: 0.12, period: 23 },
  { x: 0, y: 0.15, period: 31 },
  { x: 0, y: 0, period: 0 },
  { x: 0.14, y: 0, period: 41 },
  { x: 0, y: 0, period: 0 },
];

/**
 * Slow enough that the movement reads as light shifting rather than animation,
 * which is also why 20fps is plenty — a frame moves a vertex by well under a
 * pixel, so the extra bridge traffic of a full 60 buys nothing.
 */
const FRAME_MS = 50;

function driftedPoints(seconds: number): number[][] {
  return BASE_POINTS.map(([x, y], index) => {
    const { x: ax, y: ay, period } = DRIFT[index];
    if (period === 0) return [x, y];
    const phase = (seconds / period + index * 0.17) * Math.PI * 2;
    return [x + ax * Math.sin(phase), y + ay * Math.sin(phase * 0.61 + 1.3)];
  });
}

function useDriftingPoints(): number[][] {
  const [points, setPoints] = useState(BASE_POINTS);
  const reducedMotion = useReducedMotion();

  useFocusEffect(
    useCallback(() => {
      if (reducedMotion) return;
      const start = Date.now();
      const timer = setInterval(
        () => setPoints(driftedPoints((Date.now() - start) / 1000)),
        FRAME_MS
      );
      return () => clearInterval(timer);
    }, [reducedMotion])
  );

  return points;
}

export function ProBanner({ label, onPress }: { label: string; onPress: () => void }) {
  const points = useDriftingPoints();

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: FLAT }]} />
      <MeshGradientView
        style={StyleSheet.absoluteFill}
        columns={3}
        rows={3}
        colors={COLORS}
        points={points}
        ignoresSafeArea
      />
      <ThemedText type="title2" weight="bold" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.three,
    height: BANNER_HEIGHT,
    borderRadius: Spacing.four,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    color: '#FFFFFF',
  },
});
