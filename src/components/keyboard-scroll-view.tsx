import { ScrollView } from 'react-native';

export type KeyboardScrollViewProps = React.ComponentProps<typeof ScrollView> & {
  /** Named rather than `ref` so the wrapper stays a plain component on both platforms. */
  scrollRef?: React.RefObject<ScrollView | null>;
  /** Gap kept between a focused input and the top of the keyboard. Android only. */
  bottomOffset?: number;
};

/**
 * A scroll view that keeps the focused input above the keyboard.
 *
 * On iOS that is `automaticallyAdjustKeyboardInsets`, which the call sites
 * already pass and UIKit already honours, so this is a plain `ScrollView` and
 * `bottomOffset` goes nowhere. The Android sibling is where the work is.
 */
export function KeyboardScrollView({ scrollRef, bottomOffset, ...props }: KeyboardScrollViewProps) {
  return <ScrollView ref={scrollRef} {...props} />;
}
