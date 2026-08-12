import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Every round button in the app is this size — the exercise search bar's `+`
 *  sets it, and it matches the capsules it sits next to. */
export const CIRCLE_BUTTON_SIZE = 48;

/**
 * The glass disc itself, for the cases where the thing inside isn't a Pressable
 * — a SwiftUI menu trigger, say. The press response comes from `isInteractive`
 * rather than a wrapper, so the glass reacts the way system controls do.
 */
export function GlassCircle({
  size = CIRCLE_BUTTON_SIZE,
  tintColor,
  accessibilityLabel,
  style,
  children,
}: {
  size?: number;
  tintColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <GlassView
      isInteractive
      tintColor={tintColor}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        !isLiquidGlassAvailable() && { backgroundColor: tintColor ?? theme.surface },
        style,
      ]}>
      {children}
    </GlassView>
  );
}

export function CircleButton({
  symbol,
  symbolSize = 22,
  label,
  tintColor,
  symbolColor,
  disabled = false,
  onPress,
}: {
  symbol: SymbolViewProps['name'];
  symbolSize?: number;
  label: string;
  tintColor?: string;
  symbolColor?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <GlassCircle tintColor={tintColor}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.content}>
        <SymbolView name={symbol} size={symbolSize} tintColor={symbolColor ?? theme.text} />
      </Pressable>
    </GlassCircle>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE_BUTTON_SIZE,
    height: CIRCLE_BUTTON_SIZE,
    borderRadius: CIRCLE_BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
