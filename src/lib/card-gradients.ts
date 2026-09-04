import { asCardColor, type CardColor } from '@/constants/card-colors';

type CardGradient = {
  /** Row-major, one per vertex of the 3x3 mesh. */
  colors: string[];
  /** Below iOS 18 MeshGradientView draws nothing, so this is what shows. */
  flat: string;
};

/**
 * Every cover is the front face of the folder illustration: lit along the top,
 * a shade deeper at the bottom, and darker again into the left and right edges.
 * That corner shading is what makes a cover read as a panel rather than a
 * coloured rectangle, and it is why a template and a folder sitting in one grid
 * look like the same kind of object.
 *
 * The grid is symmetric — a panel is lit evenly, not washed — and the middle
 * row sits low so the lit face keeps most of the height.
 */
export const MESH_POINTS: number[][] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [0, 0.58],
  [0.5, 0.58],
  [1, 0.58],
  [0, 1],
  [0.5, 1],
  [1, 1],
];

/**
 * Sampled off `assets/images/folders/<color>.webp` at the nine vertices above,
 * so a cover cannot drift from the icon it is drawn beside. Regenerate by
 * sampling rather than by hand-picking a ramp — the icons are the source.
 */
const face = (...colors: string[]): CardGradient => ({ colors, flat: colors[4] });

const GRADIENTS: Record<CardColor, CardGradient> = {
  grey: face(
    '#B1B1B1', '#B9B9B9', '#B0B0B0',
    '#A1A4A4', '#A9ACAB', '#A2A4A4',
    '#858789', '#8B8D8F', '#868889',
  ),
  orange: face(
    '#E6A454', '#EFAF5B', '#E7A452',
    '#EFA445', '#F8B04D', '#F0A445',
    '#E08A2A', '#E79330', '#E18A2B',
  ),
  red: face(
    '#F06F69', '#F67871', '#F06F66',
    '#F46860', '#F97269', '#F56860',
    '#EA4D44', '#EE554C', '#EA4D45',
  ),
  yellow: face(
    '#EBC753', '#F4D15C', '#ECC752',
    '#F2CA45', '#FBD54F', '#F3CB46',
    '#E6B52B', '#EBBE31', '#E6B62B',
  ),
  purple: face(
    '#B871D4', '#BF78DA', '#B771D3',
    '#B25ED1', '#B964D8', '#B25ED1',
    '#9C43C0', '#A147C5', '#9C43C0',
  ),
  blue: face(
    '#66C8F3', '#6CD0FA', '#65C7F4',
    '#65C7F1', '#6DD0F7', '#66C7F2',
    '#57B3E4', '#5DBAE7', '#57B4E4',
  ),
  green: face(
    '#64D49E', '#69DAA5', '#63D39D',
    '#4FCD91', '#55D599', '#4FCD91',
    '#33B976', '#38BF7C', '#34BA78',
  ),
  black: face(
    '#484848', '#4E4E4E', '#484848',
    '#3B3B3B', '#414141', '#3B3B3B',
    '#272727', '#2A2A2A', '#272727',
  ),
};

export function cardGradient(color: CardColor | string | null | undefined): CardGradient {
  return GRADIENTS[asCardColor(color)];
}
