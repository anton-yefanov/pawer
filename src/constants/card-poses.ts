/**
 * Mascot poses a user can pin to a template card, stored per row as an id like
 * the colors in `card-colors.ts`. `null` means Auto: the cover keeps coming
 * from the template's dominant muscle group.
 *
 * Adding a pose is one line here, one master in `assets/masters/templates/`,
 * and one `require` in `src/lib/template-images.ts`.
 */
export const CARD_POSES = [
  'pose1',
  'pose2',
  'pose3',
  'pose4',
  'pose5',
  'pose6',
  'pose7',
] as const;

export type CardPose = (typeof CARD_POSES)[number];

/** Unknown ids read as Auto, so a pose dropped in a later build never 404s. */
export function asCardPose(value: string | null | undefined): CardPose | null {
  return CARD_POSES.includes(value as CardPose) ? (value as CardPose) : null;
}
