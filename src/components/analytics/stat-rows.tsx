import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function StatRows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <ThemedText themeColor="textSecondary">{label}</ThemedText>
          <ThemedText type="smallBold" style={styles.value}>
            {value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 40,
  },
  value: {
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
