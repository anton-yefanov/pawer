import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AreaChart } from '@/components/analytics/area-chart';
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
  const empty = series.points.length === 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <ThemedText themeColor="textSecondary">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {series.label}
        </ThemedText>
      </View>

      {!empty ? (
        <>
          <View style={styles.readout}>
            <ThemedText type="subtitle" style={styles.value}>
              {format(point ? point.value : total)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {point ? formatBucketRange(point, series.bucket) : periodLabel(period)}
            </ThemedText>
          </View>

          <AreaChart
            points={series.points}
            bucket={series.bucket}
            selected={selected}
            onSelect={setSelected}
            formatValue={format}
          />
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
  empty: {
    paddingBottom: Spacing.one,
  },
});
