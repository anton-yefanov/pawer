import { type CardColor } from '@/constants/card-colors';

/** Metro needs static `require` literals, so the map is written out. */
const FOLDER_ICONS: Record<CardColor, number> = {
  grey: require('@/assets/images/folders/grey.webp'),
  orange: require('@/assets/images/folders/orange.webp'),
  red: require('@/assets/images/folders/red.webp'),
  yellow: require('@/assets/images/folders/yellow.webp'),
  purple: require('@/assets/images/folders/purple.webp'),
  blue: require('@/assets/images/folders/blue.webp'),
  green: require('@/assets/images/folders/green.webp'),
  black: require('@/assets/images/folders/black.webp'),
};

/** Every icon is the same artwork, so one set of measurements covers the set. */
export const FOLDER_ICON_ASPECT = 420 / 353;
/**
 * The straight top edge of the back panel, as a fraction of the icon's height —
 * everything above it is the tab's curved wing.
 */
export const FOLDER_PANEL_TOP = 0.093;
/**
 * The front panel's top edge, as a fraction of the icon's height. The back
 * panel and the tab sit above it, so artwork is centred on this face rather
 * than on the whole silhouette.
 */
export const FOLDER_FACE_TOP = 60 / 353;
/** The panel's bottom corner radius, as a fraction of the icon's width. */
export const FOLDER_CORNER = 30 / 420;

export function folderIcon(color: CardColor): number {
  return FOLDER_ICONS[color];
}
