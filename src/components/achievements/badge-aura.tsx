import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { AURA_SOURCE, AURA_SPAN, auraColors } from '@/lib/badge-aura-shader';
import type { BadgeMaterial } from '@/lib/badge-material';

export function BadgeAura({
  cx,
  cy,
  size,
  progress,
  material,
}: {
  cx: number;
  cy: number;
  size: number;
  progress: SharedValue<number>;
  material: BadgeMaterial;
}) {
  const clock = useClock();
  const span = size * AURA_SPAN;

  const { glow, beam } = useMemo(() => auraColors(material), [material]);

  const uniforms = useDerivedValue(
    () => ({
      c: [span / 2, span / 2],
      r: span / 2,
      t: clock.value / 1000,
      reveal: progress.value,
      glow,
      beam,
    }),
    [span, glow, beam],
  );

  if (AURA_SOURCE == null) return null;

  return (
    <Canvas
      pointerEvents="none"
      style={{ position: 'absolute', left: cx - span / 2, top: cy - span / 2, width: span, height: span }}>
      <Fill>
        <Shader source={AURA_SOURCE} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
