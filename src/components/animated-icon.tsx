import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useSyncExternalStore } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

const LOGO_WIDTH = 200;
const PULSE_DURATION = 700;
const EXIT_DURATION = 550;
const EXIT_DELAY = 140;
const EXIT_SCALE = (Dimensions.get('screen').width / LOGO_WIDTH) * 9;

let ready = false;
const readyListeners = new Set<() => void>();

function subscribeReady(listener: () => void) {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

/** Rendered inside the providers, so the overlay above them learns when the app is usable. */
export function SplashReady() {
  useEffect(() => {
    if (ready) return;
    ready = true;
    readyListeners.forEach((listener) => listener());
  }, []);

  return null;
}

export function AnimatedSplashOverlay() {
  const loaded = useSyncExternalStore(
    subscribeReady,
    () => ready,
    () => false,
  );
  const done = useSharedValue(false);
  const pulse = useSharedValue(1);
  const scale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const backdropOpacity = useSharedValue(1);

  useEffect(() => {
    if (!loaded) {
      pulse.value = withRepeat(
        withTiming(1.08, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      return;
    }

    cancelAnimation(pulse);
    pulse.value = withTiming(1, { duration: 120 });
    scale.value = withTiming(EXIT_SCALE, {
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    logoOpacity.value = withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) });
    backdropOpacity.value = withDelay(
      EXIT_DELAY,
      withTiming(0, { duration: EXIT_DURATION - EXIT_DELAY }, (finished) => {
        'worklet';
        if (finished) {
          done.value = true;
        }
      }),
    );
  }, [loaded, pulse, scale, logoOpacity, backdropOpacity, done]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: pulse.value * scale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    display: done.value ? ('none' as const) : ('flex' as const),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.splashOverlay, backdropStyle]}
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}>
      <Animated.View style={logoStyle}>
        <Image style={styles.logo} source={require('@/assets/images/splash-logo.png')} />
      </Animated.View>
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH * (334 / 876),
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, ${Brand.splashGradientStart}, ${Brand.splashGradientEnd})`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.splash,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
