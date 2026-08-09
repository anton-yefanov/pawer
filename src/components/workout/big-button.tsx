import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  /** `filled` is the primary call to action; `tinted` sits on a card. */
  variant?: 'filled' | 'tinted';
  symbol?: SymbolViewProps['name'];
};

export function BigButton({ title, onPress, variant = 'filled', symbol }: Props) {
  const theme = useTheme();
  const filled = variant === 'filled';
  const label = filled ? theme.accentContent : theme.accent;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View
        style={[
          styles.body,
          { backgroundColor: filled ? theme.accent : 'transparent' },
        ]}>
        {symbol && <SymbolView name={symbol} size={20} tintColor={label} />}
        <ThemedText style={[styles.label, { color: label }]}>{title}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});
