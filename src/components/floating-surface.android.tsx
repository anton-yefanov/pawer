import type { Ref } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { Raised } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

export type FloatingSurfaceProps = ViewProps & {
  tintColor?: string;
  ref?: Ref<View>;
};

/**
 * The Android counterpart of the iOS liquid-glass surface.
 *
 * Glass reads as raised because it refracts what is behind it; a flat capsule
 * on grey has nothing telling it apart from a card, so the same role is carried
 * here by a shadow. `expo-glass-effect` would render a plain `View` on Android
 * and leave these controls looking pasted onto the page.
 *
 * `Raised` rather than `elevation`: Material's shadow is tight and dark enough
 * to be the platform's signature, and the iOS-only `shadow*` props cannot
 * express a wide soft one. `boxShadow` can, and reaches Android on Fabric.
 */
export function FloatingSurface({ tintColor, style, ...rest }: FloatingSurfaceProps) {
  const theme = useTheme();
  const raised = Raised[useColorScheme()];

  return (
    <View style={[raised, { backgroundColor: tintColor ?? theme.surface }, style]} {...rest} />
  );
}

export const SURFACE_HANDLES_PRESS = false;

export const AnimatedFloatingSurface = Animated.createAnimatedComponent(FloatingSurface);

/** No merging to do without glass — the row's own gap is the whole layout. */
export function FloatingContainer({
  style,
  children,
}: {
  spacing: number;
  style?: ViewProps['style'];
  children: React.ReactNode;
}) {
  return <View style={style}>{children}</View>;
}

export function useActionColors(): { tintColor: string | undefined; contentColor: string } {
  const theme = useTheme();
  return { tintColor: theme.accent, contentColor: theme.accentContent };
}
