import { useEffect, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedFloatingSurface, SURFACE_HANDLES_PRESS } from '@/components/floating-surface';
import { Pressable } from '@/components/pressable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import * as haptics from '@/lib/haptics';
import { useRestTimer } from '@/lib/rest-timer';
import { formatDuration } from '@/lib/units';
import { attempt } from '@/lib/observability';

const ROW_HEIGHT = 44 + Spacing.one * 2;

/**
 * Keeps the row mounted after the rest ends so it can fold back into its set.
 * An `exiting` layout animation can't do this: the ghost it leaves is out of
 * layout, so the rows below would jump up the moment it starts.
 */
export function RestSlot({ open, ref }: { open: boolean; ref?: Ref<View> }) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const reveal = useSharedValue(0);
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      reveal.value = withSpring(1, { dampingRatio: 0.78, duration: 620 });
    } else {
      reveal.value = withTiming(
        0,
        { duration: 380, easing: Easing.bezier(0.55, 0, 0.75, 0.3) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
  }, [open, mounted, reveal]);

  if (!mounted) return null;
  return <RestCountdownRow ref={open ? ref : undefined} open={open} reveal={reveal} />;
}

function RestCountdownRow({
  ref,
  open,
  reveal,
}: {
  ref?: Ref<View>;
  open: boolean;
  reveal: SharedValue<number>;
}) {
  const theme = useTheme();
  const rest = useRestTimer();

  // A skipped rest reads 0:00 at once; the row folds away showing the time it
  // was stopped at instead.
  const [shownRemaining, setShownRemaining] = useState(rest.remaining);
  if (open && shownRemaining !== rest.remaining) setShownRemaining(rest.remaining);
  const clock = formatDuration(shownRemaining);

  // Driven off the end timestamp rather than the displayed seconds: one linear
  // animation for the whole rest, so the fill drains smoothly instead of
  // stepping with each tick of the countdown.
  const progress = useSharedValue(1);
  const { endsAt, total } = rest;

  // Reanimated's clock stops with the app, so a backgrounded rest comes back
  // mid-animation and has to be re-aimed at the real remaining time.
  useEffect(() => {
    if (open) aim(progress, endsAt, total);
    else cancelAnimation(progress);
  }, [progress, endsAt, total, open]);
  useAppStateActive(() => {
    if (open) aim(progress, endsAt, total);
  });

  // The fill animates its measured width rather than a scaleX, because the
  // clock's accent-on-fill copy rides inside it and a scale would squash the
  // glyphs along with the bar.
  const [pillWidth, setPillWidth] = useState(0);
  const fill = useAnimatedStyle(() => ({
    width: pillWidth * progress.value,
  }));

  // The slot opens a gap and the pill, bottom-pinned inside it, overflows
  // upward behind the set above (the slot sits under that row in z-order) — so
  // it slides out of the set rather than fading in, widening as it comes.
  // No opacity anywhere: the buttons are glass, and an opacity ancestor
  // flattens them.
  const slot = useAnimatedStyle(() => ({
    height: interpolate(reveal.value, [0, 1], [0, ROW_HEIGHT], Extrapolation.CLAMP),
  }));
  const pill = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(reveal.value, [0, 1], [0.86, 1]) }],
  }));

    // `adjust` is a no-op once the rest has already run out; buzzing then would
  // claim something happened.
  const adjust = (delta: number) => {
    if (rest.setId == null) return;
    haptics.tap();
    void attempt('rest-timer', rest.adjust(delta));
  };

  return (
    <Animated.View
      ref={ref}
      style={[styles.slot, slot]}
      pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View
        style={[styles.pill, { backgroundColor: theme.backgroundElement }, pill]}
        onLayout={(event) => setPillWidth(event.nativeEvent.layout.width)}>
        <ThemedText type="subhead" weight="semibold" numeric themeColor="accent" style={styles.value}>
          {clock}
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
              {clock}
            </ThemedText>
          </Animated.View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttons}>
          <RestButton
            label="−15"
            color={theme.accent}
            reveal={reveal}
            order={0}
            onPress={() => adjust(-15)}
          />
          <RestButton
            label="+15"
            color={theme.accent}
            reveal={reveal}
            order={1}
            onPress={() => adjust(15)}
          />
          <RestButton
            label={t('workout:rest.skip')}
            color={theme.textSecondary}
            reveal={reveal}
            order={2}
            onPress={() => {
              haptics.tap();
              void attempt('rest-timer', rest.cancel());
            }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function RestButton({
  label,
  color,
  reveal,
  order,
  onPress,
}: {
  label: string;
  color: string;
  reveal: SharedValue<number>;
  order: number;
  onPress: () => void;
}) {
  // Each button pops a beat after the one before it, and on the way out the
  // same ranges run backwards, so Skip tucks away first and the pill is bare
  // by the time it slides under the set.
  const pop = useAnimatedStyle(() => {
    const start = 0.35 + order * 0.12;
    return {
      transform: [
        { scale: interpolate(reveal.value, [start, start + 0.4], [0.3, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <AnimatedFloatingSurface style={[styles.button, pop]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.buttonBody, pressed && !SURFACE_HANDLES_PRESS && styles.pressed]}>
        <ThemedText type="footnote" weight="semibold" style={{ color }}>
          {label}
        </ThemedText>
      </Pressable>
    </AnimatedFloatingSurface>
  );
}

function aim(progress: SharedValue<number>, endsAt: number | null, total: number) {
  if (endsAt == null || total <= 0) return;
  const msLeft = Math.max(0, endsAt - Date.now());
  progress.value = Math.min(1, msLeft / (total * 1000));
  progress.value = withTiming(0, { duration: msLeft, easing: Easing.linear });
}

const styles = StyleSheet.create({
  slot: {
    zIndex: -1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
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
