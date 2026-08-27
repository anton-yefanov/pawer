import { asCardColor, type CardColor } from '@/constants/card-colors';

type CardGradient = {
  /** Row-major, one per vertex of the 3x3 mesh. */
  colors: string[];
  /** Below iOS 18 MeshGradientView draws nothing, so this is what shows. */
  flat: string;
};

/**
 * Shared by every cover: a 3x3 grid whose middle row and column are pulled off
 * centre, so the blend reads as an organic wash rather than a symmetric cross.
 */
export const MESH_POINTS: number[][] = [
  [0, 0],
  [0.62, 0],
  [1, 0],
  [0, 0.38],
  [0.42, 0.55],
  [1, 0.45],
  [0, 1],
  [0.35, 1],
  [1, 1],
];

// Colour reaches every vertex — a corner left on the lightest stop reads as a
// white patch rather than a wash, which is what the flat covers never did.
const ramp = (light: string, mid: string, deep: string): string[] => [
  mid, light, mid,
  deep, mid, light,
  deep, deep, mid,
];

const GRADIENTS: Record<CardColor, CardGradient> = {
  grey: { colors: ramp('#FBFBF9', '#EAEAE6', '#D2D2CC'), flat: '#E8E8E4' },
  orange: { colors: ramp('#FFE3B8', '#FFC169', '#F09324'), flat: '#FFC169' },
  red: { colors: ramp('#FFD6CB', '#FCA189', '#EA6A52'), flat: '#FCA189' },
  pink: { colors: ramp('#FFDDEB', '#FDB2CF', '#EE8AB6'), flat: '#FDB2CF' },
  purple: { colors: ramp('#E9DCFF', '#BFA4EC', '#9670D6'), flat: '#BFA4EC' },
  blue: { colors: ramp('#DAECFF', '#A3CBF5', '#6EA6E8'), flat: '#A3CBF5' },
  green: { colors: ramp('#E4F4D9', '#B4DA9C', '#86BD6B'), flat: '#B4DA9C' },
  black: { colors: ramp('#4E4E52', '#2B2B2E', '#0D0D0F'), flat: '#2B2B2E' },
};

export function cardGradient(color: CardColor | string | null | undefined): CardGradient {
  return GRADIENTS[asCardColor(color)];
}
