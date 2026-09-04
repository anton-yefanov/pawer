import { createContext, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BadgeAura } from '@/components/achievements/badge-aura';
import { SpinnableBadge } from '@/components/achievements/badge-canvas';
import { ShareBadgeButton } from '@/components/achievements/share-badge-button';
import { SpotlightBackdrop } from '@/components/achievements/spotlight-backdrop';
import { ThemedText } from '@/components/themed-text';
import type { AchievementTier } from '@/constants/achievement-tiers';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lockedMaterial, struckMaterial } from '@/lib/badge-material';
import { REST_TILT } from '@/lib/badge-mesh';
import * as haptics from '@/lib/haptics';
import { useShareCardAssets } from '@/lib/share-card-assets';
import { track } from '@/lib/telemetry';

export type SpotlightBadge = {
  /** Identifies the slot it came from, so that slot can be left empty. */
  id: string;
  tier: AchievementTier;
  exercise: string;
  unlocked: boolean;
  requirement: string;
  detail: string;
};

/** Where the badge was when it was tapped, in window coordinates. */
export type BadgeFrame = { x: number; y: number; size: number };

type Open = (badge: SpotlightBadge, frame: BadgeFrame) => void;

type Spotlight = {
  open: Open;
  close: () => void;
  /** The badge currently out of the grid, by slot id, or null. */
  lifted: string | null;
};

const SpotlightContext = createContext<Spotlight | null>(null);

export function useBadgeSpotlight() {
  const spotlight = useContext(SpotlightContext);
  if (spotlight == null) throw new Error('useBadgeSpotlight needs a BadgeSpotlight above it');
  return spotlight;
}

/** Far enough below the bottom edge that the button is off-screen at rest. */
const ACTIONS_TRAVEL = 160;

const MAX_X = (55 * Math.PI) / 180;
/** Radians per pixel dragged — about 0.55° per point. */
const RATE = 0.0096;
const DRIFT = 14000;
/** Neither direction is an event; the badge just goes, and gets there. */
const LIFT = 240;
const RETURN = 200;

/**
 * Wraps the achievements screen. A tap on a badge lifts it out of the grid to
 * the middle of the sheet over a blurred backdrop, where a finger spins it.
 *
 * The lift is not a shared element: the tapped slot measures itself in the
 * window, the overlay measures itself, and the difference is a frame in the
 * overlay's own coordinates — so the badge starts exactly on the disc it came
 * from and returns to it without either view knowing about the other.
 */
export function BadgeSpotlight({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const shareAssets = useShareCardAssets();
  const root = useRef<View>(null);
  const [badge, setBadge] = useState<SpotlightBadge | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [closing, setClosing] = useState(false);

  const progress = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const originSize = useSharedValue(0);
  const rx = useSharedValue(REST_TILT.rx);
  const ry = useSharedValue(REST_TILT.ry);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);

  const size = Math.min(box.width * 0.6, 240);

  const open: Open = (next, frame) => {
    // The slot measured itself in the window; the overlay is positioned in
    // its own space, so the offset between them is the missing half.
    root.current?.measureInWindow((rootX, rootY) => {
      // Lifting out of a close already in flight: the timing below replaces
      // that animation, so its completion never runs and would otherwise leave
      // the overlay mounted, dead to touches, for good.
      setClosing(false);
      originX.value = frame.x - rootX;
      originY.value = frame.y - rootY;
      originSize.value = frame.size;
      rx.value = REST_TILT.rx;
      ry.value = REST_TILT.ry;
      setBadge(next);
      progress.value = withTiming(1, { duration: LIFT, easing: Easing.out(Easing.cubic) });
      ry.value = withRepeat(
        withTiming(REST_TILT.ry + Math.PI * 2, {
          duration: DRIFT,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      track('achievement_badge_viewed', {});
    });
  };

  function close() {
    if (closing) return;
    haptics.tap();
    setClosing(true);

    // Whatever the badge was doing — drifting, or still coasting out of a
    // flick — stops here. A decay left running would ride the shrink back to
    // the grid as a wobble, on top of the disc it is supposed to become.
    cancelAnimation(rx);
    cancelAnimation(ry);

    const leaving = badge?.id ?? '';
    const out = { duration: RETURN, easing: Easing.out(Easing.quad) };
    rx.value = withTiming(REST_TILT.rx, out);
    ry.value = withTiming(restingTurn(ry.value), out);
    progress.value = withTiming(0, out, (finished) => {
      if (finished) runOnJS(done)(leaving);
    });
  }

  /**
   * Only clears the badge this close was actually for. A lift that lands in the
   * frame between the animation finishing and this running would otherwise be
   * torn down by it.
   */
  function done(leaving: string) {
    setBadge((current) => (current?.id === leaving ? null : current));
    setClosing(false);
  }

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox({ width, height });
  };

  const spin = Gesture.Pan()
    // Without an activation offset the Pan claims the touch on touch-down and
    // cancels it in every view under it, so the Share button never sees a tap.
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      cancelAnimation(ry);
      grabX.value = ry.value;
      grabY.value = rx.value;
    })
    .onUpdate((event) => {
      ry.value = grabX.value + event.translationX * RATE;
      rx.value = Math.max(-MAX_X, Math.min(MAX_X, grabY.value + event.translationY * RATE));
    })
    .onEnd((event) => {
      if (event.velocityY > 1400 && event.translationY > 40) {
        runOnJS(close)();
        return;
      }
      ry.value = withDecay({ velocity: event.velocityX * RATE, deceleration: 0.99 });
      rx.value = withSpring(REST_TILT.rx, { damping: 16, stiffness: 120 });
    });

  const stage = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [originSize.value / (size || 1), 1]);
    const x = interpolate(
      progress.value,
      [0, 1],
      [originX.value + originSize.value / 2, box.width / 2],
    );
    const y = interpolate(
      progress.value,
      [0, 1],
      [originY.value + originSize.value / 2, box.height * 0.42],
    );
    return {
      transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { scale }],
    };
  });

  const caption = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [16, 0]) }],
  }));

  // Slides in rather than fading: the button is glass, and a GlassView keeps
  // refracting through an animated opacity — the effect is lost and what is
  // left is an untinted label. So it arrives from off the bottom edge instead.
  // It also lives inside the gesture subtree rather than beside it: a sibling
  // above the spin's Pan never receives the tap at all, whatever its z-order.
  const actions = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [ACTIONS_TRAVEL, 0], Extrapolation.CLAMP) },
    ],
  }));

  const material = badge?.unlocked
    ? struckMaterial(badge.tier.id, badge.tier.material)
    : lockedMaterial(theme);

  return (
    <SpotlightContext.Provider value={{ open, close, lifted: badge?.id ?? null }}>
      <View ref={root} style={styles.root} onLayout={onLayout}>
        {children}

        <SpotlightBackdrop progress={progress} open={badge != null && !closing} />

        {badge != null && (
          <GestureDetector gesture={spin}>
            {/* Dead to touches the moment it starts leaving, so the grid
                underneath is usable again without waiting for it. */}
            <View style={StyleSheet.absoluteFill} pointerEvents={closing ? 'none' : 'auto'}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={close}
                accessibilityLabel="Close"
              />

              {badge.unlocked && (
                <BadgeAura
                  cx={box.width / 2}
                  cy={box.height * 0.42}
                  size={size}
                  progress={progress}
                  material={material}
                />
              )}

              <Animated.View style={[styles.stage, { width: size, height: size }, stage]}>
                <SpinnableBadge
                  numeral={badge.tier.numeral}
                  material={material}
                  size={size}
                  rx={rx}
                  ry={ry}
                />
              </Animated.View>

              <Animated.View
                style={[
                  styles.caption,
                  { top: box.height * 0.42 + size / 2 + Spacing.four },
                  caption,
                ]}
                pointerEvents="none">
                <ThemedText
                  type="caption2"
                  weight="semibold"
                  themeColor="textTertiary"
                  style={styles.eyebrow}>
                  {badge.tier.name}
                </ThemedText>
                <ThemedText type="title3" numberOfLines={2} style={styles.exercise}>
                  {badge.exercise}
                </ThemedText>
                <ThemedText type="largeTitle" numeric style={styles.value}>
                  {badge.requirement}
                </ThemedText>
                <ThemedText type="footnote" themeColor="textSecondary" numeric>
                  {badge.detail}
                </ThemedText>
              </Animated.View>

              {badge.unlocked && (
              <Animated.View
                style={[
                  styles.actions,
                  { bottom: Math.max(insets.bottom, Spacing.four) + Spacing.four },
                  actions,
                ]}>
                <ShareBadgeButton
                  assets={shareAssets}
                  tier={badge.tier}
                  exercise={badge.exercise}
                  requirement={badge.requirement}
                  detail={badge.detail}
                  material={material}
                />
              </Animated.View>
              )}
            </View>
          </GestureDetector>
        )}

      </View>
    </SpotlightContext.Provider>
  );
}

/** The equivalent of the resting angle nearest where the spin left off. */
function restingTurn(angle: number): number {
  const turns = Math.round((angle - REST_TILT.ry) / (Math.PI * 2));
  return REST_TILT.ry + turns * Math.PI * 2;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  caption: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  exercise: {
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  value: {
    marginTop: Spacing.two,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
