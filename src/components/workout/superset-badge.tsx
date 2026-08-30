import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSupersetColor } from '@/hooks/use-superset-color';

export function SupersetBadge({ index }: { index: number }) {
  const color = useSupersetColor(index);

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <ThemedText type="caption2" weight="bold" themeColor="accentContent">
        Superset
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
