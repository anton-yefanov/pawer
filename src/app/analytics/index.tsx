import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DayPicker } from '@/components/analytics/day-picker';
import { PeriodPicker } from '@/components/analytics/period-picker';
import { MetricChart } from '@/components/analytics/metric-chart';
import { QuickSummary } from '@/components/analytics/quick-summary';
import { RecordsCard } from '@/components/analytics/records-card';
import { StatRows, type StatRow } from '@/components/analytics/stat-rows';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/lib/weight-unit';
import {
  combineTotals,
  firstWorkoutQuery,
  metricSeriesQuery,
  periodRecordsQuery,
  prTotalsQuery,
  setTotalsQuery,
  workoutTotalsQuery,
} from '@/lib/analytics-queries';
import { DEFAULT_PERIOD, rangeFor, type PeriodId } from '@/lib/analytics-period';
import { comparisonLabel, delta, previousRange } from '@/lib/analytics-compare';
import { buildQuickSummary } from '@/lib/analytics-insights';
import { buildSeries } from '@/lib/analytics-series';
import { distanceUnitFor, formatDistance, formatTonnage, splitMeasure } from '@/lib/units';
import { formatHoursMinutes } from '@/lib/workout-stats';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const unit = useWeightUnit();

  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const [customFrom, setCustomFrom] = useState(() => rangeFor('d30').from);
  const [customTo, setCustomTo] = useState(() => Date.now());
  const [today] = useState(() => Date.now());

  const range = useMemo(
    () => rangeFor(period, { from: new Date(customFrom), to: new Date(customTo) }),
    [period, customFrom, customTo],
  );

  const previous = useMemo(() => previousRange(range), [range]);

  const { data: workoutRows } = useLiveQuery(workoutTotalsQuery(range), [range]);
  const { data: setRows } = useLiveQuery(setTotalsQuery(range), [range]);
  const { data: metricRows } = useLiveQuery(metricSeriesQuery(range), [range]);
  const { data: prRows } = useLiveQuery(prTotalsQuery(range), [range]);
  const { data: recordRows } = useLiveQuery(periodRecordsQuery(range), [range]);

  // Always built, so the hook order never depends on whether the period has a
  // comparison; the result is discarded when `previous` is null.
  const comparison = previous ?? range;
  const { data: pastWorkoutRows } = useLiveQuery(workoutTotalsQuery(comparison), [comparison]);
  const { data: pastSetRows } = useLiveQuery(setTotalsQuery(comparison), [comparison]);
  const { data: pastPrRows } = useLiveQuery(prTotalsQuery(comparison), [comparison]);

  const totals = combineTotals(workoutRows?.[0], setRows?.[0], prRows?.[0]);
  const past = combineTotals(pastWorkoutRows?.[0], pastSetRows?.[0], pastPrRows?.[0]);

  const { data: firstRows } = useLiveQuery(firstWorkoutQuery(), []);
  const firstWorkoutAt = firstRows?.[0]?.startedAt ?? null;

  // Three conditions, all about not promising a comparison the screen can't
  // keep. The rows have to belong to *this* comparison — until they do they are
  // the last period's, and a delta drawn from them would show for a frame and
  // then vanish. The previous window has to be one the user's training actually
  // covers, or a partial window reads as an impossible gain. And it has to
  // contain a workout at all.
  const settled =
    pastWorkoutRows?.[0]?.from === comparison.from && pastPrRows?.[0]?.from === comparison.from;
  const covered = previous !== null && firstWorkoutAt !== null && firstWorkoutAt <= previous.from;
  const comparable = covered && settled && past.workouts > 0;

  const since = (pick: (of: typeof totals) => number) =>
    comparable ? delta(pick(totals), pick(past)) : undefined;

  const summary = buildQuickSummary({ totals, past, comparable, range, unit });

  const tonnage = useMemo(
    () => buildSeries(metricRows ?? [], range, (row) => row.volumeKg),
    [metricRows, range],
  );
  const duration = useMemo(
    () => buildSeries(metricRows ?? [], range, (row) => row.durationMs),
    [metricRows, range],
  );

  const rows: StatRow[] = [
    {
      tiles: [
        {
          label: 'Workouts',
          value: String(totals.workouts),
          delta: since((of) => of.workouts),
        },
        {
          label: 'Total tonnage',
          ...splitMeasure(formatTonnage(totals.volumeKg, unit)),
          delta: since((of) => of.volumeKg),
        },
      ],
    },
    {
      split: [
        {
          label: 'Sets',
          value: String(totals.completedSets),
          delta: since((of) => of.completedSets),
        },
        { label: 'Reps', value: String(totals.reps), delta: since((of) => of.reps) },
        {
          label: 'PRs',
          value: String(totals.records),
          delta: since((of) => of.records),
        },
      ],
    },
    {
      tiles: [
        {
          label: 'Time in gym',
          value: formatHoursMinutes(totals.durationMs),
          delta: since((of) => of.durationMs),
        },
        {
          label: 'Avg duration',
          value: formatHoursMinutes(totals.avgDurationMs),
          delta: since((of) => of.avgDurationMs),
        },
      ],
    },
    {
      tiles: [
        {
          label: 'Avg tonnage',
          ...splitMeasure(formatTonnage(totals.avgVolumeKg, unit)),
          delta: since((of) => of.avgVolumeKg),
        },
        {
          label: 'Total distance',
          ...splitMeasure(formatDistance(totals.distanceM, distanceUnitFor(unit))),
          delta: since((of) => of.distanceM),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <PeriodPicker value={period} onChange={setPeriod} />

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

      <QuickSummary summary={summary} />

      <StatRows rows={rows} />

      {comparable && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
          vs {comparisonLabel(range)}
        </ThemedText>
      )}

      <RecordsCard records={recordRows ?? []} unit={unit} />

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
    gap: Spacing.two,
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
  caption: {
    paddingHorizontal: Spacing.three,
    marginTop: -Spacing.one,
  },
});
