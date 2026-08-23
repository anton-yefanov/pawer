import type { ScrollView } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
  type KeyboardAwareScrollViewRef,
  type KeyboardToolbarProps,
} from 'react-native-keyboard-controller';

import { Colors, Spacing } from '@/constants/theme';

type Props = React.ComponentProps<typeof KeyboardAwareScrollView> & {
  scrollRef?: React.RefObject<ScrollView | null>;
};

/** `KEYBOARD_TOOLBAR_HEIGHT` in the library, which doesn't export it. */
const TOOLBAR_HEIGHT = 42;

const TOOLBAR_THEME: NonNullable<KeyboardToolbarProps['theme']> = {
  light: {
    primary: Colors.light.accent,
    disabled: Colors.light.textSecondary,
    background: Colors.light.surface,
    ripple: Colors.light.backgroundSelected,
  },
  dark: {
    primary: Colors.dark.accent,
    disabled: Colors.dark.textSecondary,
    background: Colors.dark.surface,
    ripple: Colors.dark.backgroundSelected,
  },
};

/**
 * Android's window resize alone leaves the focused cell where it was — the set
 * logger's inputs sit deep in a long scroll, so the row being typed into ends
 * up under the keyboard. `KeyboardAwareScrollView` is what scrolls it back out,
 * and it tracks the IME inset rather than the `keyboardDidShow` event, so the
 * content rides the keyboard up instead of jumping after it.
 *
 * The toolbar ships with the scroll view rather than being mounted per screen
 * because it is the other half of the same problem: `number-pad` and
 * `decimal-pad` have no return key on Android and a multiline field's Enter
 * inserts a newline, so without it the only way out of a set's weight field is
 * the system Back gesture. It also gives the arrows that walk a card's fields in
 * order. Being sticky and absolutely positioned it costs the scroll view's
 * layout nothing — only the `bottomOffset` that keeps the focused input clear
 * of it.
 *
 * `disableScrollOnKeyboardHide` is what stops the content jumping when the
 * keyboard goes away. The library remembers the offset the focused input was
 * focused at and scrolls back to it on hide, so typing into a set at the top of
 * a workout, scrolling down to the last exercise and then tapping anything that
 * takes focus away threw the list back up to that first input.
 */
export function KeyboardScrollView({
  scrollRef,
  bottomOffset = TOOLBAR_HEIGHT + Spacing.two,
  ...props
}: Props) {
  return (
    <>
      <KeyboardAwareScrollView
        // `KeyboardAwareScrollViewRef` is a `ScrollView` plus one method; only
        // `RefObject`'s invariance makes the cast necessary.
        ref={scrollRef as React.RefObject<KeyboardAwareScrollViewRef | null>}
        bottomOffset={bottomOffset}
        disableScrollOnKeyboardHide
        {...props}
      />
      <KeyboardToolbar theme={TOOLBAR_THEME} />
    </>
  );
}
