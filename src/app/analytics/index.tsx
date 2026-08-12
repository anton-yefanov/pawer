import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DayPicker } from '@/components/analytics/day-picker';
import { PeriodMenu } from '@/components/analytics/period-menu';
import { MetricChart } from '@/components/analytics/metric-chart';
import { StatRows, type StatBadge } from '@/components/analytics/stat-rows';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/lib/weight-unit';
import {
  combineTotals,
  metricSeriesQuery,
  setTotalsQuery,
  workoutTotalsQuery,
} from '@/lib/analytics-queries';
import { DEFAULT_PERIOD, rangeFor, type PeriodId } from '@/lib/analytics-period';
import { buildSeries } from '@/lib/analytics-series';
import { distanceUnitFor, formatDistance, formatTonnage } from '@/lib/units';
import { formatClock, formatHoursMinutes } from '@/lib/workout-stats';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const unit = useWeightUnit();

  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const [customFrom, setCustomFrom] = useState(() => rangeFor('d30').from);
  const [customTo, setCustomTo] = useState(() => Date.now());
  const [today] = useState(() => Date.now());

  const range = useMemo(
    () => rangeFor(period, { from: new Date(customFrom), to: new Date(customTo) }),
    [period, customFrom, customTo]
  );

  const { data: workoutRows } = useLiveQuery(workoutTotalsQuery(range), [range]);
  const { data: setRows } = useLiveQuery(setTotalsQuery(range), [range]);
  const { data: metricRows } = useLiveQuery(metricSeriesQuery(range), [range]);

  const totals = combineTotals(workoutRows?.[0], setRows?.[0]);

  const tonnage = useMemo(
    () => buildSeries(metricRows ?? [], range, (row) => row.volumeKg),
    [metricRows, range]
  );
  const duration = useMemo(
    () => buildSeries(metricRows ?? [], range, (row) => row.durationMs),
    [metricRows, range]
  );

  const badges: StatBadge[] = [
    { label: 'Workouts', value: String(totals.workouts), span: 3, hero: true },
    { label: 'Total tonnage', value: formatTonnage(totals.volumeKg, unit), span: 3, hero: true },
    { label: 'Sets', value: String(totals.completedSets), span: 2 },
    { label: 'Reps', value: String(totals.reps), span: 2 },
    { label: 'Exercises', value: String(totals.exerciseEntries), span: 2 },
    { label: 'Time in gym', value: formatHoursMinutes(totals.durationMs), span: 4, hero: true },
    { label: 'Avg duration', value: formatClock(totals.avgDurationMs), span: 2 },
    { label: 'Avg tonnage', value: formatTonnage(totals.avgVolumeKg, unit), span: 3 },
    {
      label: 'Total distance',
      value: formatDistance(totals.distanceM, distanceUnitFor(unit)),
      span: 3,
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.cardRow}>
          <ThemedText themeColor="textSecondary">Period</ThemedText>
          <PeriodMenu value={period} onChange={setPeriod} />
        </View>

        {period === 'custom' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
            <View style={styles.cardRow}>
              <ThemedText themeColor="textSecondary">From</ThemedText>
              <DayPicker
                value={new Date(customFrom)}
                max={new Date(Math.min(customTo, today))}
                onChange={(next) => setCustomFrom(next.getTime())}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
            <View style={styles.cardRow}>
              <ThemedText themeColor="textSecondary">To</ThemedText>
              <DayPicker
                value={new Date(customTo)}
                min={new Date(customFrom)}
                max={new Date(today)}
                onChange={(next) => setCustomTo(next.getTime())}
              />
            </View>
          </>
        )}
      </View>

      <StatRows badges={badges} />

      <MetricChart
        title="Total tonnage"
        series={tonnage}
        total={totals.volumeKg}
        format={(value) => formatTonnage(value, unit)}
        period={period}
      />

      <MetricChart
        title="Time in gym"
        series={duration}
        total={totals.durationMs}
        format={formatHoursMinutes}
        period={period}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 48,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
