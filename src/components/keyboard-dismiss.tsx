import { Keyboard, StyleSheet } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { CIRCLE_BUTTON_SIZE, CircleButton } from '@/components/circle-button';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';

/** Far enough below the window's bottom edge to be off screen entirely. Shared
 *  with `set-focus-arrows.tsx`, which parks on the same row. */
export const PARKED = CIRCLE_BUTTON_SIZE + Spacing.two * 2;

/**
 * The way out of a keyboard that has no return key — the weight, reps and
 * distance cells are all `decimal-pad`/`number-pad`.
 *
 * `KeyboardStickyView` follows the keyboard's frame rather than its show/hide
 * events, so the disc tracks an interactive drag instead of waiting for it to
 * finish. When the keyboard is down it is parked below the window rather than
 * unmounted or faded out: `UIGlassEffect` installs once and stays that way, and
 * a `GlassView` keeps refracting at zero opacity, so a faded disc would still
 * show through the keyboard.
 *
 * Render it as a sibling of a screen's scroll view, not inside it.
 */
export function KeyboardDismissButton() {
  return (
    <KeyboardStickyView
      offset={{ closed: PARKED }}
      style={styles.sticky}
      pointerEvents="box-none">
      <CircleButton
        symbol="keyboard.chevron.compact.down"
        label={t('common:hideKeyboard')}
        onPress={Keyboard.dismiss}
      />
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.two,
  },
});
