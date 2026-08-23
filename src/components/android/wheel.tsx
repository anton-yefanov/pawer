import { useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export const WHEEL_ITEM_HEIGHT = 36;

/** Odd, so one row sits centred in the selection band with padding either side. */
const VISIBLE = 5;

export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE;

/**
 * A snapping column of numbers — the Android stand-in for a SwiftUI wheel
 * `Picker`, which `@expo/ui/jetpack-compose` has no counterpart for (its
 * `TimePickerDialog` is a clock dial and can't express seconds).
 *
 * The scroll position is only seeded on mount: writing `contentOffset` back on
 * every render fights the finger mid-flick, and the value can only change here
 * by scrolling anyway.
 */
export function Wheel({
  unit,
  values,
  selection,
  onChange,
}: {
  unit: string;
  values: readonly number[];
  selection: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const last = useRef(selection);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const value = values[Math.max(0, Math.min(values.length - 1, index))];
    if (value === last.current) return;
    last.current = value;
    haptics.select();
    onChange(value);
  };

  return (
    <View style={styles.column}>
      <ThemedText type="small" themeColor="textSecondary">
        {unit}
      </ThemedText>
      <View style={styles.wheel}>
        <ScrollView
          {...SHEET_SCROLL}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          contentOffset={{ x: 0, y: values.indexOf(selection) * WHEEL_ITEM_HEIGHT }}
          contentContainerStyle={{ paddingVertical: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2 }}
          onMomentumScrollEnd={settle}
          onScrollEndDrag={settle}>
          {values.map((value) => (
            <View key={value} style={styles.item}>
              <ThemedText>{String(value).padStart(2, '0')}</ThemedText>
            </View>
          ))}
        </ScrollView>
        <View
          pointerEvents="none"
          style={[styles.band, { borderColor: theme.backgroundSelected }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  wheel: {
    width: 58,
    height: WHEEL_HEIGHT,
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2,
    height: WHEEL_ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
