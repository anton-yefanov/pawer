import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function PrChip({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.chip, { backgroundColor: theme.accentTint }]}>
      <Icon name="trophy.fill" size={12} tintColor={theme.accent} />
      <ThemedText type="caption1" weight="bold" themeColor="accent">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
