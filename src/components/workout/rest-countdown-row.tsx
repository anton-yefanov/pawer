import { useEffect, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { useRestTimer } from '@/lib/rest-timer';
import { formatDuration } from '@/lib/units';
import { attempt } from '@/lib/observability';

export function RestCountdownRow({ ref }: { ref?: Ref<View> }) {
  const theme = useTheme();
  const rest = useRestTimer();

  // Driven off the end timestamp rather than the displayed seconds: one linear
  // animation for the whole rest, so the fill drains smoothly instead of
  // stepping with each tick of the countdown.
  const progress = useSharedValue(1);
  const { endsAt, total } = rest;

  // Reanimated's clock stops with the app, so a backgrounded rest comes back
  // mid-animation and has to be re-aimed at the real remaining time.
  useEffect(() => aim(progress, endsAt, total), [progress, endsAt, total]);
  useAppStateActive(() => aim(progress, endsAt, total));

  // scaleX rather than a percentage width: a percentage on an absolute child
  // resolves against the row's *content* box, so a full bar stopped short of
  // the padding on each end.
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  // `adjust` is a no-op once the rest has already run out; buzzing then would
  // claim something happened.
  const adjust = (delta: number) => {
    if (rest.setId == null) return;
    haptics.tap();
    void attempt('rest-timer', rest.adjust(delta));
  };

  return (
    <View ref={ref} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, fill, { backgroundColor: theme.accent }]}
      />

      <Pressable onPress={() => adjust(-15)} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="subhead" weight="semibold" themeColor="accent">
          −15
        </ThemedText>
      </Pressable>

      <ThemedText type="headline" numeric themeColor="accent" style={styles.value}>
        {formatDuration(rest.remaining)}
      </ThemedText>

      <Pressable onPress={() => adjust(15)} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="subhead" weight="semibold" themeColor="accent">
          +15
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={() => {
          haptics.tap();
          void attempt('rest-timer', rest.cancel());
        }}
        hitSlop={Spacing.two}
        style={styles.adjust}>
        <ThemedText type="subhead" weight="semibold" themeColor="textSecondary">
          Skip
        </ThemedText>
      </Pressable>
    </View>
  );
}

function aim(progress: SharedValue<number>, endsAt: number | null, total: number) {
  if (endsAt == null || total <= 0) return;
  const msLeft = Math.max(0, endsAt - Date.now());
  progress.value = Math.min(1, msLeft / (total * 1000));
  progress.value = withTiming(0, { duration: msLeft, easing: Easing.linear });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    height: 36,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    transformOrigin: 'left',
    opacity: 0.18,
  },
  value: {
    flex: 1,
    textAlign: 'center',
  },
  adjust: {
    paddingHorizontal: Spacing.two,
  },
});
