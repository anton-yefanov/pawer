import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRestTimer } from '@/lib/rest-timer';
import { formatDuration } from '@/lib/units';

export function RestCountdownRow() {
  const theme = useTheme();
  const rest = useRestTimer();

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={() => rest.adjust(-15)} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="small" themeColor="accent">
          −15
        </ThemedText>
      </Pressable>

      <ThemedText type="smallBold" themeColor="accent" style={styles.value}>
        {formatDuration(rest.remaining)}
      </ThemedText>

      <Pressable onPress={() => rest.adjust(15)} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="small" themeColor="accent">
          +15
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => rest.cancel()} hitSlop={Spacing.two} style={styles.adjust}>
        <ThemedText type="small" themeColor="textSecondary">
          Skip
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.half,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    height: 28,
  },
  value: {
    flex: 1,
    textAlign: 'center',
  },
  adjust: {
    paddingHorizontal: Spacing.two,
  },
});
