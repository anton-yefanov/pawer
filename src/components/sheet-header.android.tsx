import { Stack } from 'expo-router';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { SheetGrabber } from '@/components/sheet-grabber';
import type { SheetHeaderProps } from '@/components/sheet-header.types';
import { ThemedText } from '@/components/themed-text';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';

/**
 * A `formSheet` is a Material bottom sheet here, and react-native-screens never
 * builds an AppBar for one — `ScreenStackFragment` skips it entirely — so the
 * title and every header button of the iOS nav bar simply have nowhere to go.
 * `unstable_headerLeftItems` is iOS-only on top of that. The row is drawn in
 * the sheet's own content instead, above whatever scrolls below it — as is the
 * grabber, which the sheet presentation never draws on this platform either.
 */
export function SheetHeader({ title, left, right, options }: SheetHeaderProps) {
  const empty = left == null && right == null && (title == null || title === '');
  const [sides, setSides] = useState({ left: 0, right: 0 });

  // The title is centred on the bar rather than on the gap between the buttons,
  // so an unequal pair — a bare timer against a "Finish" pill — doesn't push it
  // off the sheet's centre. Its inset clears the wider of the two sides.
  const inset = Math.max(sides.left, sides.right);
  const measure = (side: 'left' | 'right') => (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setSides((prev) => (prev[side] === width ? prev : { ...prev, [side]: width }));
  };

  return (
    <>
      {options && <Stack.Screen options={options} />}
      <SheetGrabber />
      {!empty && (
        <View style={styles.bar}>
          <View style={styles.side} onLayout={measure('left')}>
            {left}
          </View>
          <View style={[styles.side, styles.rightSide]} onLayout={measure('right')}>
            {right}
          </View>
          <View pointerEvents="none" style={[styles.title, { left: inset, right: inset }]}>
            {typeof title === 'string' ? (
              <ThemedText type="smallBold" numberOfLines={1}>
                {title}
              </ThemedText>
            ) : (
              title
            )}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Drawn after the content that follows it, so the buttons' shadows are not
  // cut off by the scroll view's own background — the bar is the one floating
  // surface in the app that its siblings paint over rather than under.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingTop: SHEET_TOP_INSET,
    paddingBottom: Spacing.one,
    zIndex: 10,
  },
  side: {
    minWidth: HEADER_CIRCLE_SIZE,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  title: {
    position: 'absolute',
    top: SHEET_TOP_INSET,
    bottom: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
