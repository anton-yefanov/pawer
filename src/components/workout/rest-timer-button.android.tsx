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
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import { useTheme } from '@/hooks/use-theme';
import { useRestTimer } from '@/lib/rest-timer';
import { formatDuration } from '@/lib/units';

const SIZE = CIRCLE_BUTTON_SIZE;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2 - 1;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Same control as the iOS one, with the readout drawn in React rather than by a
 * SwiftUI `Text(timerInterval:)`. `RestCountdownRow` already re-renders off
 * `rest.remaining` every second, so the seconds here cost nothing extra — only
 * the ring needs to be smooth, and that is on the UI thread either way.
 */
export function RestTimerButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const rest = useRestTimer();

  const { endsAt, total } = rest;
  if (rest.setId == null || endsAt == null) return null;

  return (
    <GlassCircle>
      <View pointerEvents="none" style={styles.readout}>
        <ThemedText style={styles.time} themeColor="accent">
          {formatDuration(rest.remaining)}
        </ThemedText>
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

function Ring({ endsAt, total, color }: { endsAt: number | null; total: number; color: string }) {
  const progress = useSharedValue(1);

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
  readout: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
});
