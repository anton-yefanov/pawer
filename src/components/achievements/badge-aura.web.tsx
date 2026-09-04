import type { SharedValue } from 'react-native-reanimated';

import type { BadgeMaterial } from '@/lib/badge-material';

/** Skia draws the aura; web has no CanvasKit build here, so the badge stands unlit. */
export function BadgeAura(_props: {
  cx: number;
  cy: number;
  size: number;
  progress: SharedValue<number>;
  material: BadgeMaterial;
}) {
  return null;
}
