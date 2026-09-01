import { useEffect, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FloatingSurface, SURFACE_HANDLES_PRESS } from '@/components/floating-surface';
import { Pressable } from '@/components/pressable';
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

  // The fill animates its measured width rather than a scaleX, because the
  // clock's accent-on-fill copy rides inside it and a scale would squash the
  // glyphs along with the bar.
  const [pillWidth, setPillWidth] = useState(0);
  const fill = useAnimatedStyle(() => ({
    width: pillWidth * progress.value,
  }));

  // `adjust` is a no-op once the rest has already run out; buzzing then would
  // claim something happened.
  const adjust = (delta: number) => {
    if (rest.setId == null) return;
    haptics.tap();
    void attempt('rest-timer', rest.adjust(delta));
  };

  return (
    <View ref={ref} style={styles.row}>
      <View
        style={[styles.pill, { backgroundColor: theme.backgroundElement }]}
        onLayout={(event) => setPillWidth(event.nativeEvent.layout.width)}>
        <ThemedText type="subhead" weight="semibold" numeric themeColor="accent" style={styles.value}>
          {formatDuration(rest.remaining)}
        </ThemedText>

        {/* The bar and a second copy of the clock in the on-fill colour, clipped
            to the bar's own width: the digits recolour glyph by glyph as the
            edge sweeps past them, which no single text colour can do. */}
        <View style={styles.fillClip} pointerEvents="none">
          <Animated.View style={[styles.fill, fill, { backgroundColor: theme.accent }]}>
            <ThemedText
              type="subhead"
              weight="semibold"
              numeric
              themeColor="accentContent"
              style={[styles.value, styles.valueOnFill]}>
              {formatDuration(rest.remaining)}
            </ThemedText>
          </Animated.View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttons}>
          <RestButton label="−15" color={theme.accent} onPress={() => adjust(-15)} />
          <RestButton label="+15" color={theme.accent} onPress={() => adjust(15)} />
          <RestButton
            label="Skip"
            color={theme.textSecondary}
            onPress={() => {
              haptics.tap();
              void attempt('rest-timer', rest.cancel());
            }}
          />
        </View>
      </View>
    </View>
  );
}

function RestButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <FloatingSurface style={styles.button}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.buttonBody, pressed && !SURFACE_HANDLES_PRESS && styles.pressed]}>
        <ThemedText type="footnote" weight="semibold" style={{ color }}>
          {label}
        </ThemedText>
      </Pressable>
    </FloatingSurface>
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingRight: Spacing.two,
    // Concentric with the buttons: their 16 plus the 6 of clearance around them.
    borderRadius: 22,
  },
  // The bar's own corners stay square and the pill-shaped clip rounds whatever
  // of it is on screen, so the leading edge is a straight line mid-pill.
  fillClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 22,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // A fixed width, not a minimum: the copy riding on the fill is positioned by
  // hand and has to land on the same pixels as the one underneath it.
  value: {
    width: 48,
    marginLeft: Spacing.three,
    textAlign: 'center',
  },
  valueOnFill: {
    position: 'absolute',
    left: 0,
  },
  spacer: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    borderRadius: 16,
  },
  buttonBody: {
    height: 32,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
