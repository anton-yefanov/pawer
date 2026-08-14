import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

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
        !isLiquidGlassAvailable() && {
          backgroundColor: tintColor ?? theme.surface,
        },
        style,
      ]}>
      {children}
    </GlassView>
  );
}

export function CircleButton({
  symbol,
  symbolSize = 22,
  size,
  label,
  tintColor,
  symbolColor,
  disabled = false,
  feedback = 'tap',
  onPress,
}: {
  symbol: SymbolViewProps['name'];
  symbolSize?: number;
  size?: number;
  label: string;
  tintColor?: string;
  symbolColor?: string;
  disabled?: boolean;
  /** `press` for the buttons that commit something rather than just navigate. */
  feedback?: 'tap' | 'press';
  onPress: () => void;
}) {
  const theme = useTheme();

  // `disabled` is handled inside `onPress` rather than passed to the Pressable:
  // a disabled Pressable swallows the touch entirely, and the buzz is the only
  // thing telling you why nothing happened.
  return (
    <GlassCircle size={size} tintColor={tintColor}>
      <Pressable
        onPress={() => {
          if (disabled) {
            haptics.reject();
            return;
          }
          if (feedback === 'press') haptics.press();
          else haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={styles.content}>
        <SymbolView name={symbol} size={symbolSize} tintColor={symbolColor ?? theme.text} />
      </Pressable>
    </GlassCircle>
  );
}

const styles = StyleSheet.create({
  // No `overflow: 'hidden'` — that sets `clipsToBounds` on the host view, which
  // traps UIGlassEffect's interactive stretch inside the button's own rect. The
  // glass shape comes from `borderRadius` reaching the native effect, not from
  // clipping, so the disc stays round and is free to deform under a finger.
  circle: {
    width: CIRCLE_BUTTON_SIZE,
    height: CIRCLE_BUTTON_SIZE,
    borderRadius: CIRCLE_BUTTON_SIZE / 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
