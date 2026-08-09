import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DayPicker } from '@/components/analytics/day-picker';
import { PeriodMenu } from '@/components/analytics/period-menu';
import { MetricChart } from '@/components/analytics/metric-chart';
import { StatRows } from '@/components/analytics/stat-rows';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/hooks/use-weight-unit';
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

  const rows = [
    ['Workouts', String(totals.workouts)],
    ['Exercises', String(totals.exerciseEntries)],
    ['Sets', String(totals.completedSets)],
    ['Reps', String(totals.reps)],
    ['Time in gym', formatHoursMinutes(totals.durationMs)],
    ['Avg duration', formatClock(totals.avgDurationMs)],
    ['Total tonnage', formatTonnage(totals.volumeKg, unit)],
    ['Avg tonnage', formatTonnage(totals.avgVolumeKg, unit)],
    ['Total distance', formatDistance(totals.distanceM, distanceUnitFor(unit))],
  ] as const;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.cardRow}>
          <ThemedText themeColor="textSecondary">Period</ThemedText>
          <PeriodMenu value={period} onChange={setPeriod} />
        </View>

        {period === 'custom' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.cardRow}>
              <ThemedText themeColor="textSecondary">From</ThemedText>
              <DayPicker
                value={new Date(customFrom)}
                onChange={(next) => setCustomFrom(next.getTime())}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.cardRow}>
              <ThemedText themeColor="textSecondary">To</ThemedText>
              <DayPicker
                value={new Date(customTo)}
                onChange={(next) => setCustomTo(next.getTime())}
              />
            </View>
          </>
        )}
      </View>

      <StatRows rows={rows} />

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
