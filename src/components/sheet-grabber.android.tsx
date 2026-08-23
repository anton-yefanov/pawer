import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A Material bottom sheet has no drag handle of its own — react-native-screens
 * accepts `sheetGrabberVisible` on Android and draws nothing for it — so the
 * pill is content. It floats over whatever scrolls beneath it, the way the iOS
 * grabber does, which is why nothing here takes part in layout: a sheet that
 * pins content to its top edge clears it with `SHEET_TOP_INSET` instead.
 */
export function SheetGrabber() {
  const theme = useTheme();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: Spacing.two,
    zIndex: 20,
  },
  pill: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
});
