import { Host, Text, ZStack } from '@expo/ui/swift-ui';
import { font, foregroundColor, frame, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import { useTheme } from '@/hooks/use-theme';
import { useRestTimer } from '@/lib/rest-timer';

const SIZE = CIRCLE_BUTTON_SIZE;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2 - 1;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The rest countdown, mirrored into the sheet header so it stays reachable once
 * the resting set has scrolled away; pressing it scrolls that set back into
 * view. It shows nothing at all when no rest is running.
 *
 * The readout is a SwiftUI `Text(timerInterval:)` rather than a formatted
 * string, so it ticks on the native side and stays smooth however often React
 * happens to re-render. The Host is explicitly sized or it shrinks to the glyph,
 * and it can't take the tap itself, so the press target is an overlaid Pressable.
 */
export function RestTimerButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const rest = useRestTimer();

  const { endsAt, total } = rest;
  if (rest.setId == null || endsAt == null) return null;

  return (
    <GlassCircle>
      <View pointerEvents="none">
        <Host style={styles.host} ignoreSafeArea="all">
          <ZStack modifiers={[frame({ width: SIZE, height: SIZE })]}>
            <Text
              timerInterval={{ lower: new Date(endsAt - total * 1000), upper: new Date(endsAt) }}
              countsDown
              modifiers={[
                font({ size: 14, weight: 'semibold', design: 'rounded' }),
                monospacedDigit(),
                foregroundColor(theme.accent),
              ]}
            />
          </ZStack>
        </Host>
      </View>

      <Ring endsAt={endsAt} total={total} color={theme.accent} />

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Show rest timer"
        style={StyleSheet.absoluteFill}
      />
    </GlassCircle>
  );
}

/**
 * Drained off the end timestamp rather than the displayed seconds, the same way
 * `RestCountdownRow` does it: one linear animation for the whole countdown, so
 * the ring empties smoothly instead of stepping with each tick.
 */
function Ring({ endsAt, total, color }: { endsAt: number | null; total: number; color: string }) {
  const progress = useSharedValue(1);

  // Reanimated's clock stops with the app, so a backgrounded countdown comes
  // back mid-animation and has to be re-aimed at the real remaining time.
  useEffect(() => aim(progress, endsAt, total), [progress, endsAt, total]);
  useAppStateActive(() => aim(progress, endsAt, total));

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={SIZE} height={SIZE}>
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          // The ring starts at the top and drains from there.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
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
  host: {
    width: SIZE,
    height: SIZE,
  },
});
