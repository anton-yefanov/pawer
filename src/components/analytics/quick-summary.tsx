import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { QuickSummary as Summary } from '@/lib/analytics-insights';
import { mascotFace } from '@/lib/mascot-images';

export function QuickSummary({ summary }: { summary: Summary }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Image source={mascotFace('winking')} style={styles.mascot} contentFit="contain" />
        <ThemedText themeColor="textSecondary">Quick summary</ThemedText>
      </View>

      {summary.kind === 'placeholder' ? (
        <View style={styles.lines}>
          {summary.lines.map((line) => (
            <ThemedText key={line} type="small" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
        </View>
      ) : (
        <ThemedText>
          {/* Plain `Text` for the bold runs: nested inside a `ThemedText` it
              inherits size and colour and overrides only the weight. */}
          {summary.segments.map((segment, index) =>
            segment.bold ? (
              <Text key={index} style={styles.value}>
                {segment.text}
              </Text>
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
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mascot: {
    width: 32,
    height: 32,
  },
  lines: {
    gap: Spacing.one,
  },
  value: {
    fontWeight: 700,
  },
});
