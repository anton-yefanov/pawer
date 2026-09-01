import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/** Seconds, to match the lift it fades with. */
const FADE = 0.24;

/**
 * What the spotlight puts the rest of the sheet behind. `GlassView` is a real
 * `UIVisualEffectView`, so it blurs the content composited behind it rather
 * than a snapshot of it.
 *
 * **It fades by animating the effect, never the opacity.** UIKit switches a
 * visual effect off inside a layer whose alpha isn't 1, so driving this from
 * `progress` the way everything else in the spotlight is driven left the blur
 * silently dead — intermittently, since it depended on where the fade happened
 * to be when the effect went to draw. `glassEffectStyle` animates between
 * `regular` and `none` natively and is the supported way to do this.
 *
 * The scrim fallback has no such problem, so it fades on opacity as usual, and
 * it is the backdrop outright on anything before the liquid glass design.
 *
 * No `overflow: 'hidden'` anywhere here, for the reason `circle-button.tsx`
 * records: clipping to bounds traps the effect.
 *
 * Memoised, config included: a fresh `glassEffectStyle` object restarts the
 * native transition, and this sits under a screen that re-renders whenever its
 * live query ticks. That was a blur blinking at random on the way in.
 */
export const SpotlightBackdrop = memo(function SpotlightBackdrop({
  progress,
  open,
}: {
  progress: SharedValue<number>;
  open: boolean;
}) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({ opacity: progress.value }));
  const effect = useMemo(
    () => ({ style: open ? 'regular' : 'none', animate: true, animationDuration: FADE }) as const,
    [open],
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} glassEffectStyle={effect} />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, style]}
    />
  );
});
