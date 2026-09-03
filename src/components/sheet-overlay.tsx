import { StyleSheet, View } from 'react-native';

/**
 * Groups everything a sheet draws *over* its scroll view — a footer, the
 * keyboard disc, an alert's zero-sized host — into one view.
 *
 * react-native-screens sizes a `formSheet`'s scroll view itself, and only
 * understands a content view holding the scroll view and at most one header
 * before it; anything else and it warns and leaves the scroll view at whatever
 * height the last layout gave it. Every one of these children is already
 * absolutely positioned or zero-sized, so collecting them costs no layout.
 */
export function SheetOverlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" collapsable={false}>
      {children}
    </View>
  );
}
