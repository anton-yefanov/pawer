/**
 * Cover hues for template and folder cards, one per macOS folder icon in
 * `assets/images/folders` — a template's mesh and a folder's icon are the same
 * eight hues. Stored per row as an id, never as colours, so
 * `src/lib/card-gradients.ts` stays the only resolver. `null` means `grey`.
 *
 * A cover does not follow the colour scheme — artwork sits directly on it, so
 * every cover but `black` is pastel in both schemes.
 */
export const CARD_COLORS = [
  'grey',
  'orange',
  'red',
  'yellow',
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
