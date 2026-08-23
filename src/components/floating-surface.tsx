import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { Ref } from 'react';
import type { View, ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

export type FloatingSurfaceProps = ViewProps & {
  /** Fills the glass, and is the flat colour on the pre-glass fallback. */
  tintColor?: string;
  ref?: Ref<View>;
};

/**
 * Anything that floats over content rather than sitting in the page: the
 * search row's capsules, every circle button, the primary big button.
 *
 * On iOS that is liquid glass, `isInteractive` so it responds to a finger the
 * way system controls do, with a flat capsule on versions that predate it. The
 * Android sibling is the Material equivalent — an elevated surface.
 */
export function FloatingSurface({ tintColor, style, ...rest }: FloatingSurfaceProps) {
  const theme = useTheme();

  return (
    <GlassView
      isInteractive
      tintColor={tintColor}
      style={[!isLiquidGlassAvailable() && { backgroundColor: tintColor ?? theme.surface }, style]}
      {...rest}
    />
  );
}

/** Glass reacts to a finger on its own; a Material surface leaves that to the
 *  control inside it. */
export const SURFACE_HANDLES_PRESS = true;

export const AnimatedFloatingSurface = Animated.createAnimatedComponent(FloatingSurface);

/** Lets neighbouring surfaces merge as they approach each other. */
export function FloatingContainer({
  spacing,
  style,
  children,
}: {
  spacing: number;
  style?: ViewProps['style'];
  children: React.ReactNode;
}) {
  return (
    <GlassContainer spacing={spacing} style={style}>
      {children}
    </GlassContainer>
  );
}

/**
 * The colours for a floating surface that is the screen's primary action. iOS
 * leaves it as plain glass carrying a normal label; Android promotes it to a
 * FAB, which is a filled accent surface.
 */
export function useActionColors(): { tintColor: string | undefined; contentColor: string } {
  const theme = useTheme();
  return { tintColor: undefined, contentColor: theme.text };
}
