import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/analytics/bar-chart';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { periodLabel, type PeriodId } from '@/lib/analytics-period';
import { formatBucketRange, type Series } from '@/lib/analytics-series';

export function MetricChart({
  title,
  series,
  total,
  format,
  period,
}: {
  title: string;
  series: Series;
  total: number;
  format: (value: number) => string;
  period: PeriodId;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<number | null>(null);

  const point = selected === null ? undefined : series.points[selected];
  const first = series.points[0];
  const last = series.points[series.points.length - 1];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <ThemedText themeColor="textSecondary">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {series.label}
        </ThemedText>
      </View>

      {first && last ? (
        <>
          <View style={styles.readout}>
            <ThemedText type="subtitle" style={styles.value}>
              {format(point ? point.value : total)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {point ? formatBucketRange(point, series.bucket) : periodLabel(period)}
            </ThemedText>
          </View>

          <BarChart points={series.points} selected={selected} onSelect={setSelected} />

          <View style={styles.axis}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatBucketRange(first, series.bucket)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatBucketRange(last, series.bucket)}
            </ThemedText>
          </View>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No finished workouts in this period.
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
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  readout: {
    gap: Spacing.half,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  empty: {
    paddingBottom: Spacing.one,
  },
});
