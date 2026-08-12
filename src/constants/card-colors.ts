/**
 * Cover colors for template and folder cards. Stored per row as an id, never as
 * a hex value, so both schemes stay resolvable here. `null` means `grey`.
 *
 * Light values are pastel and dark values are deep muted tints — same pairing
 * as the `*Muted` colors in `theme.ts` — because the mascot artwork is
 * dark-outlined and sits directly on this fill.
 */
export const CARD_COLORS = [
  'grey',
  'orange',
  'red',
  'pink',
  'purple',
  'blue',
  'teal',
  'green',
] as const;

export type CardColor = (typeof CARD_COLORS)[number];

type Gradient = { center: string; edge: string };

export const CardGradients: Record<'light' | 'dark', Record<CardColor, Gradient>> = {
  light: {
    grey: { center: '#F7F7F9', edge: '#E6E6EB' },
    orange: { center: '#FFEAD1', edge: '#FBD3A6' },
    red: { center: '#FFDFDB', edge: '#F9C0B8' },
    pink: { center: '#FFDFEE', edge: '#F7BEDA' },
    purple: { center: '#EAE2FF', edge: '#CFC0F7' },
    blue: { center: '#DCECFF', edge: '#B7D5F7' },
    teal: { center: '#D6F1EC', edge: '#ABDFD6' },
    green: { center: '#E0F3D9', edge: '#BCE3AE' },
  },
  dark: {
    grey: { center: '#2A2B2E', edge: '#1A1B1D' },
    orange: { center: '#3E2A12', edge: '#2A1C0C' },
    red: { center: '#3E1E1A', edge: '#2A1412' },
    pink: { center: '#3D1C2D', edge: '#2A131F' },
    purple: { center: '#2C2149', edge: '#1E1732' },
    blue: { center: '#1E3350', edge: '#152538' },
    teal: { center: '#14352F', edge: '#0E2521' },
    green: { center: '#1D3A1C', edge: '#142814' },
  },
};

export function asCardColor(value: string | null | undefined): CardColor {
  return CARD_COLORS.includes(value as CardColor) ? (value as CardColor) : 'grey';
}
