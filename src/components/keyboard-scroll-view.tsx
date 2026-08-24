import type { ScrollView } from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

import { CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { KeyboardToolbar } from '@/components/keyboard-toolbar';
import { Spacing } from '@/constants/theme';

type Props = React.ComponentProps<typeof KeyboardAwareScrollView> & {
  /** Named rather than `ref` so the wrapper stays a plain component. */
  scrollRef?: React.RefObject<ScrollView | null>;
};

/**
 * A scroll view that keeps the focused input above the keyboard.
 *
 * `KeyboardAwareScrollView` rather than `automaticallyAdjustKeyboardInsets`,
 * on both platforms. It tracks the keyboard's inset rather than its
 * show/hide events, so content rides the keyboard up instead of jumping after
 * it — and, unlike UIKit, it never rewrites the content offset behind the
 * scroll view's back, which is what left a sheet's short form scrolled under
 * its own nav bar once the keyboard had come and gone.
 *
 * `mode` is not left at its default. `insets` fakes the room the keyboard needs
 * with hidden bottom padding, and paying it back means scrolling by hand to a
 * position saved when the keyboard appeared — half a second after the keyboard
 * goes, wherever you have scrolled to since is thrown away. `layout` gives that
 * room to a real spacer view, so the scroll view reflows on its own and there
 * is no correction to make. `disableScrollOnKeyboardHide` covers the rest: the
 * library otherwise scrolls back to the offset the input was focused at.
 *
 * `bottomOffset` is the room left below the focused input, sized to the disc in
 * `keyboard-dismiss.tsx` that floats there.
 */
export function KeyboardScrollView({
  scrollRef,
  bottomOffset = CIRCLE_BUTTON_SIZE + Spacing.two,
  ...props
}: Props) {
  return (
    <>
      <KeyboardAwareScrollView
        // `KeyboardAwareScrollViewRef` is a `ScrollView` plus one method; only
        // `RefObject`'s invariance makes the cast necessary.
        ref={scrollRef as React.RefObject<KeyboardAwareScrollViewRef | null>}
        bottomOffset={bottomOffset}
        mode="layout"
        disableScrollOnKeyboardHide
        {...props}
      />
      <KeyboardToolbar />
    </>
  );
}
