import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SheetFooterProps } from '@/components/sheet-footer.types';
import { Spacing } from '@/constants/theme';

/**
 * A `formSheet` is a Material bottom sheet here, and its content view is always
 * the full height of the container — only its *top* moves with the detent. So
 * anything laid out at `bottom: 0` sits one detent offset below the sheet's
 * visible edge, off screen entirely at a partial detent. `unstable_sheetFooter`
 * is the way out: react-native-screens positions that child itself, against the
 * sheet's visible bottom, on every detent change and drag frame.
 */
export function SheetFooter({ children, style }: SheetFooterProps) {
  const navigation = useNavigation();

  // No dependency array: the option is a closure over `children`, so each
  // render owes the navigator a fresh one. The cleanup is what a conditionally
  // rendered footer needs — an option set from a screen outlives the component
  // that set it.
  useLayoutEffect(() => {
    navigation.setOptions({
      unstable_sheetFooter: () => <View style={[styles.footer, style]}>{children}</View>,
    });
    return () => navigation.setOptions({ unstable_sheetFooter: undefined });
  });

  return null;
}

const styles = StyleSheet.create({
  footer: {
    padding: Spacing.three,
  },
});
