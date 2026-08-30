import { CannonConfetti } from 'react-native-fast-confetti';

import { CARD_COLORS } from '@/constants/card-colors';
import { cardGradient } from '@/lib/card-gradients';

/**
 * The card hues, which are the only palette this app authors — grey and black
 * are the two that read as debris rather than celebration.
 */
const COLORS = CARD_COLORS.filter((color) => color !== 'grey' && color !== 'black').map(
  (color) => cardGradient(color).flat,
);

const PER_CANNON = 60;

/** A wide cone, against the library's 36 degrees, so a shot fans out as it climbs. */
const SPREAD = Math.PI / 2.2;

/**
 * Speed varies from full down to a little over half, not down to nothing: the
 * bottom of the default range is pieces that never leave the corner they were
 * fired from.
 */
const SPEED_VARIATION = { min: 0.55, max: 1 };

/**
 * The library's physics is normalised to the container's height, so these are
 * fractions of the sheet rather than pixels: at the defaults (speed 2, gravity 3,
 * drag 3) a shot from a bottom corner peaks about a third of the way up. Faster,
 * with lighter gravity and a slacker vertical drag, so the fastest pieces just
 * clear the top edge and the slowest still pass the stats card. Horizontal drag
 * is the one that goes *up*: it is what stops a flake that crosses the sheet from
 * carrying on for two more widths of it.
 */
const SPEED = 4;
const GRAVITY = 2;
const DRAG = { horizontal: 8, vertical: 1.5 };

/**
 * Two cannons fired from the sheet's bottom corners, each aimed at the far top
 * one so the two streams cross diagonally over the stats, and over before the
 * recap has been read. The canvas is absolutely filled and untouchable by
 * construction, so it drops in as a sibling of the content it decorates. Reduce
 * Motion is honoured by the library itself.
 */
/** Long enough for the sheet to have settled before anything is fired at it. */
export const CONFETTI_DELAY_MS = 200;

export function WorkoutConfetti() {
  return (
    <CannonConfetti
      colors={COLORS}
      gravity={GRAVITY}
      drag={DRAG}
      speedVariation={SPEED_VARIATION}
      fadeOutOnEnd
      autoStartDelay={CONFETTI_DELAY_MS}>
      <CannonConfetti.Origin
        position="bottom-left"
        target="top-right"
        count={PER_CANNON}
        spread={SPREAD}
        initialSpeed={SPEED}
      />
      <CannonConfetti.Origin
        position="bottom-right"
        target="top-left"
        count={PER_CANNON}
        spread={SPREAD}
        initialSpeed={SPEED}
      />
    </CannonConfetti>
  );
}
