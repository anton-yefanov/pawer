import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

const HEIGHT = 50;

type Props = {
  title: string;
  onPress: () => void;
  /** `filled` is the primary call to action; `tinted` sits on a card. */
  variant?: 'filled' | 'tinted' | 'danger';
  symbol?: SymbolViewProps['name'];
  /** `complete` for the buttons that commit a batch rather than open something. */
  feedback?: 'complete';
};

export function BigButton({ title, onPress, variant = 'filled', symbol, feedback }: Props) {
  const theme = useTheme();
  const filled = variant === 'filled';
  const label = filled ? theme.accentContent : variant === 'danger' ? theme.danger : theme.accent;

  // Glass runs its own press response through `isInteractive`, so the Pressable
  // sits inside it and only the borderless variants dim on press themselves.
  const body = (
    <Pressable
      onPress={() => {
        if (feedback === 'complete') haptics.complete();
        else if (variant === 'danger') haptics.warn();
        else haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.body, !filled && pressed && styles.pressed]}>
      {symbol && <SymbolView name={symbol} size={20} tintColor={label} />}
      <ThemedText style={[styles.label, { color: label }]}>{title}</ThemedText>
    </Pressable>
  );

  if (!filled) return <View style={styles.button}>{body}</View>;

  return (
    <GlassView
      isInteractive
      tintColor={theme.accent}
      style={[styles.button, !isLiquidGlassAvailable() && { backgroundColor: theme.accent }]}>
      {body}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  // `overflow: 'hidden'` would clip the glass stretch to the button rect — see
  // the note in circle-button.tsx.
  button: {
    borderRadius: HEIGHT / 2,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: HEIGHT,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});
