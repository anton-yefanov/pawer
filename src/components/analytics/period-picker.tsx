import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PERIODS, type PeriodId } from '@/lib/analytics-period';
import * as haptics from '@/lib/haptics';

const FADE_WIDTH = 24;

/**
 * The transparent stop is the card color at zero alpha rather than
 * `transparent`, which is *black* at zero alpha and fades through grey.
 */
const fadeFill = (surface: string, towards: 'left' | 'right') =>
  ({
    experimental_backgroundImage: `linear-gradient(to ${towards}, ${surface} 0%, ${surface}00 100%)`,
  }) as const;

/**
 * Plain React Native chips rather than a SwiftUI `Menu`: a menu's label is
 * re-laid-out when its string changes, which flashed the longest preset
 * centre-cropped for a beat, and no combination of `fixedSize`, a fixed frame
 * or an invisible label got rid of it.
 *
 * The row bleeds past the card's padding and each edge carries a fade that is
 * only opaque while there is content to scroll to on that side.
 */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodId;
  onChange: (next: PeriodId) => void;
}) {
  const theme = useTheme();

  const offset = useSharedValue(0);
  const overflow = useSharedValue(0);
  const contentWidth = useSharedValue(0);
  const viewportWidth = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.x;
  });

  const remeasure = () => {
    overflow.value = Math.max(0, contentWidth.value - viewportWidth.value);
  };

  const leftFade = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, offset.value) / FADE_WIDTH),
  }));
  const rightFade = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, overflow.value - offset.value) / FADE_WIDTH),
  }));

  return (
    <View style={styles.block}>
      <ThemedText themeColor="textSecondary">Period</ThemedText>

      <View style={styles.scroller}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={(event) => {
            viewportWidth.value = event.nativeEvent.layout.width;
            remeasure();
          }}
          onContentSizeChange={(width) => {
            contentWidth.value = width;
            remeasure();
          }}
          contentContainerStyle={styles.chips}>
          {PERIODS.map((period) => {
            const selected = period.id === value;
            return (
              <Pressable
                key={period.id}
                onPress={() => {
                  if (selected) return;
                  haptics.select();
                  onChange(period.id);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}>
                <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
                  {period.short}
                </ThemedText>
              </Pressable>
            );
          })}
        </Animated.ScrollView>

        <Animated.View
          pointerEvents="none"
          style={[styles.fade, styles.fadeLeft, fadeFill(theme.surface, 'right'), leftFade]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.fade, styles.fadeRight, fadeFill(theme.surface, 'left'), rightFade]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  scroller: {
    marginHorizontal: -Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
});
