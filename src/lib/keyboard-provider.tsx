import { KeyboardProvider as Controller } from 'react-native-keyboard-controller';

/**
 * `react-native-keyboard-controller` on both platforms.
 *
 * iOS used to be left out of this, on the grounds that the native stack insets
 * its own scroll views and `automaticallyAdjustKeyboardInsets` was enough. It
 * isn't: UIKit saves and restores the content offset around the keyboard, and
 * inside a sheet it restores it relative to the wrong inset — a short form ends
 * up scrolled under its own nav bar by the header's height, permanently, and
 * the same arithmetic makes the content jump on focus. The controller owns the
 * insets and the focused-field scrolling itself, so there is no restore to
 * fight (see `src/components/keyboard-scroll-view.tsx`).
 */
export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  return <Controller>{children}</Controller>;
}
