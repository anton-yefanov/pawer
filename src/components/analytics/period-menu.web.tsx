import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PERIODS, type PeriodId } from '@/lib/analytics-period';

/** No SwiftUI menu on web; the presets are laid out as chips instead. */
export function PeriodMenu({
  value,
  onChange,
}: {
  value: PeriodId;
  onChange: (next: PeriodId) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {PERIODS.map((period) => (
        <Pressable
          key={period.id}
          onPress={() => onChange(period.id)}
          style={[
            styles.chip,
            {
              backgroundColor:
                period.id === value ? theme.backgroundSelected : theme.backgroundElement,
            },
          ]}>
          <ThemedText
            type="small"
            themeColor={period.id === value ? 'text' : 'textSecondary'}>
            {period.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
