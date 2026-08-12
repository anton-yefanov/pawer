import { useEffect } from 'react';
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
import { useRestTimer } from '@/lib/rest-timer';
import { formatDuration } from '@/lib/units';

export function RestCountdownRow() {
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
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, fill, { backgroundColor: theme.accent }]}
      />

      <Pressable onPress={() => rest.adjust(-15)} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="small" themeColor="accent">
          −15
        </ThemedText>
      </Pressable>

      <ThemedText type="smallBold" themeColor="accent" style={styles.value}>
        {formatDuration(rest.remaining)}
      </ThemedText>

      <Pressable onPress={() => rest.adjust(15)} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="small" themeColor="accent">
          +15
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => rest.cancel()} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="small" themeColor="textSecondary">
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
