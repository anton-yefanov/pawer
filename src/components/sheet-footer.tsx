import { StyleSheet, View } from 'react-native';

import type { SheetFooterProps } from '@/components/sheet-footer.types';
import { Spacing } from '@/constants/theme';

/**
 * The one way a sheet pins a control to its bottom edge. On iOS the sheet's
 * content view is exactly the sheet, so this is a plain absolute overlay; on
 * Android it has to be a native footer (see sheet-footer.android.tsx).
 */
export function SheetFooter({ children, style }: SheetFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
  },
});
