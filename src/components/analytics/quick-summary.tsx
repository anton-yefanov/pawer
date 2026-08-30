import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { QuickSummary as Summary } from '@/lib/analytics-insights';

export function QuickSummary({ summary }: { summary: Summary }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <ThemedText type="headline">Quick summary</ThemedText>

      {summary.kind === 'placeholder' ? (
        <View style={styles.lines}>
          {summary.lines.map((line) => (
            <ThemedText key={line} type="footnote" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </View>
      ) : (
        <ThemedText>
          {summary.segments.map((segment, index) =>
            segment.bold ? (
              <ThemedText key={index} weight="semibold">
                {segment.text}
              </ThemedText>
            ) : (
              segment.text
            )
          )}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  lines: {
    gap: Spacing.one,
  },
});
