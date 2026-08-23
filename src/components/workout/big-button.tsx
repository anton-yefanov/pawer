import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FloatingSurface, SURFACE_HANDLES_PRESS } from '@/components/floating-surface';
import { Icon, type IconName } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

const HEIGHT = 50;

type Props = {
  title: string;
  onPress: () => void;
  /** `filled` is the primary call to action; `tinted` sits on a card, `soft` is
   *  a tinted one that needs to read as a control against a white card. */
  variant?: 'filled' | 'tinted' | 'soft' | 'danger';
  symbol?: IconName;
  /** Replaces the symbol when the icon is artwork rather than an SF Symbol. */
  icon?: ReactNode;
  /** `complete` for the buttons that commit a batch rather than open something. */
  feedback?: 'complete';
};

export function BigButton({ title, onPress, variant = 'filled', symbol, icon, feedback }: Props) {
  const theme = useTheme();
  const filled = variant === 'filled';
  const danger = variant === 'danger';
  const label = filled ? theme.accentContent : danger ? theme.danger : theme.accent;

  // Glass runs its own press response through `isInteractive`, so on iOS the
  // Pressable sits inside it and only the borderless variants dim themselves.
  // A Material surface doesn't, so there the filled one dims too.
  const body = (
    <Pressable
      onPress={() => {
        if (feedback === 'complete') haptics.complete();
        else if (variant === 'danger') haptics.warn();
        else haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.body,
        pressed && !(filled && SURFACE_HANDLES_PRESS) && styles.pressed,
      ]}>
      {icon ?? (symbol && <Icon name={symbol} size={20} tintColor={label} />)}
      <ThemedText style={[styles.label, { color: label }]}>{title}</ThemedText>
    </Pressable>
  );

  if (!filled)
    return (
      <View
        style={[
          styles.button,
          danger && { backgroundColor: theme.surface },
          variant === 'soft' && { backgroundColor: theme.backgroundElement },
        ]}>
        {body}
      </View>
    );

  return (
    <FloatingSurface tintColor={theme.accent} style={styles.button}>
      {body}
    </FloatingSurface>
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
