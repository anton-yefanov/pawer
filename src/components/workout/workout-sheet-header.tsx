import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ClockButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Timer"
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.clock,
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}>
      <SymbolView name="alarm" size={20} tintColor={theme.text} />
    </Pressable>
  );
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Close"
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.clock,
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}>
      <SymbolView name="xmark" size={16} tintColor={theme.text} />
    </Pressable>
  );
}

/** The filled pill that sits in a sheet's top-right corner. */
export function HeaderPillButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.finish,
        { backgroundColor: theme.accent },
        (pressed || disabled) && styles.pressed,
      ]}>
      <ThemedText style={[styles.finishLabel, { color: theme.accentContent }]}>{title}</ThemedText>
    </Pressable>
  );
}

export function FinishButton({ onPress }: { onPress: () => void }) {
  return <HeaderPillButton title="Finish" onPress={onPress} />;
}

/** expo-router measures header slots tightly; the wrapper keeps the tap target square. */
export function HeaderSlot({ children }: { children: React.ReactNode }) {
  return <View style={styles.slot}>{children}</View>;
}

const styles = StyleSheet.create({
  slot: {
    justifyContent: 'center',
  },
  clock: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finish: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
