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
  grey: { colors: ramp('#F4F4F3', '#DCDDDD', '#B6B8B8'), flat: '#DCDDDD' },
  orange: { colors: ramp('#FCD8A8', '#F9B150', '#E1870D'), flat: '#F9B150' },
  red: { colors: ramp('#FDB9B5', '#FB736B', '#D64137'), flat: '#FB736B' },
  yellow: { colors: ramp('#FDEAA8', '#FBD550', '#C9A319'), flat: '#FBD550' },
  purple: { colors: ramp('#DDB2EC', '#BB66DA', '#8F46A9'), flat: '#BB66DA' },
  blue: { colors: ramp('#B7E8FC', '#6FD0F9', '#3997CB'), flat: '#6FD0F9' },
  green: { colors: ramp('#ACEBCC', '#58D79A', '#16A362'), flat: '#58D79A' },
  black: { colors: ramp('#5A5A5A', '#434343', '#1E1E1E'), flat: '#434343' },
};

export function cardGradient(color: CardColor | string | null | undefined): CardGradient {
  return GRADIENTS[asCardColor(color)];
}
