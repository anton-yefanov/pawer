/**
 * Cover artwork for template and folder cards. Stored per row as an id, never
 * as a path, so `src/lib/card-backgrounds.ts` stays the only resolver. `null`
 * means `grey`.
 *
 * A cover does not follow the colour scheme — the mascot artwork is
 * dark-outlined and sits directly on it, so every cover but `black` is pastel
 * in both schemes.
 */
export const CARD_COLORS = [
  'grey',
  'orange',
  'red',
  'pink',
  'purple',
  'blue',
  'green',
  'black',
] as const;

export type CardColor = (typeof CARD_COLORS)[number];

export function asCardColor(value: string | null | undefined): CardColor {
  return CARD_COLORS.includes(value as CardColor) ? (value as CardColor) : 'grey';
}

/** Content drawn straight onto a cover has to invert on the dark ones. */
export function isDarkCardColor(color: CardColor): boolean {
  return color === 'black';
}
