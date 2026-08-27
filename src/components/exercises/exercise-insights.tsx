import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { ExerciseHistory, HISTORY_SESSIONS } from '@/components/exercises/exercise-history';
import { ExerciseProgress } from '@/components/exercises/exercise-progress';
import { ExerciseRecords } from '@/components/exercises/exercise-records';
import { ExerciseTabs, type ExerciseTab } from '@/components/exercises/exercise-tabs';
import { PeriodMenu } from '@/components/exercises/period-menu';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  exercisePrWorkoutsQuery,
  exerciseRecordsQuery,
  exerciseSessionsQuery,
  exerciseSetsQuery,
  exerciseTotalsQuery,
  type ExerciseTotals,
} from '@/lib/exercise-history-queries';
import { totalsFor } from '@/lib/exercise-metrics';
import {
  DEFAULT_EXERCISE_PERIOD,
  EXERCISE_PERIODS,
  exerciseRange,
  type ExercisePeriodId,
} from '@/lib/exercise-period';
import { trackingTypeOf } from '@/lib/tracking-types';
import {
  distanceUnitFor,
  formatDistance,
  formatDuration,
  formatTonnage,
  splitMeasure,
  type WeightUnit,
} from '@/lib/units';
import { useWeightUnit } from '@/lib/weight-unit';

const EMPTY_TOTALS: ExerciseTotals = {
  sessions: 0,
  completedSets: 0,
  reps: 0,
  volumeKg: 0,
  distanceM: 0,
  durationSeconds: 0,
  lastAt: null,
  firstAt: null,
};

const PANELS = ['stats', 'history'] as const;
type PanelId = (typeof PANELS)[number];

/** Enough travel to read as a direction, short enough not to look like a page. */
const SLIDE = 28;

/**
 * The panel is placed at the offset it travelled from and animated back, rather
 * than two panels riding a track: they are different heights, and a track would
 * have to animate the container's height too or the sheet jumps under the
 * finger.
 *
 * Outside the component because the React Compiler treats a shared value
 * captured in a component body as immutable — the same reason `aim` sits at
 * module scope in src/components/workout/rest-timer-button.tsx.
 */
function slide(shift: SharedValue<number>, fade: SharedValue<number>, direction: number) {
  shift.value = direction * SLIDE;
  shift.value = withTiming(0, { duration: 220 });
  fade.value = 0;
  fade.value = withTiming(1, { duration: 220 });
}

function totalMeasure(totals: ExerciseTotals, kind: string, unit: WeightUnit) {
  switch (kind) {
    case 'volume':
      return {
        label: 'Volume',
        ...splitMeasure(formatTonnage(totals.volumeKg, unit)),
      };
    case 'distance':
      return {
        label: 'Distance',
        ...splitMeasure(formatDistance(totals.distanceM, distanceUnitFor(unit))),
      };
    case 'duration':
      return {
        label: 'Time',
        value: formatDuration(totals.durationSeconds),
        unit: undefined,
      };
    default:
      return { label: 'Reps', value: String(totals.reps), unit: undefined };
  }
}

/**
 * Everything the app knows about one exercise: standing records, lifetime
 * totals, a per-session trend and the last few sessions.
 *
 * `StatRows` from the analytics screen is deliberately not reused — its tiles
 * are `surface` cards, which is the sheet's own background, so they would read
 * as nothing at all here.
 */
export function ExerciseInsights({
  id,
  trackingType,
  onOpenTechnique,
}: {
  id: string;
  trackingType: string | null;
  /** Absent for a custom exercise, which has no upstream technique video. */
  onOpenTechnique?: () => void;
}) {
  const unit = useWeightUnit();
  const type = trackingTypeOf(trackingType);

  const [tab, setTab] = useState<PanelId>('stats');
  const [period, setPeriod] = useState<ExercisePeriodId>(DEFAULT_EXERCISE_PERIOD);
  const range = useMemo(() => exerciseRange(period), [period]);
  const shift = useSharedValue(0);
  const fade = useSharedValue(1);

  const panel = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: shift.value }],
  }));

  const select = (next: string) => {
    if (next === tab) return;
    slide(shift, fade, PANELS.indexOf(next as PanelId) > PANELS.indexOf(tab) ? 1 : -1);
    setTab(next as PanelId);
  };

  const tabs: ExerciseTab[] = [
    { id: 'stats', label: 'Stats', icon: 'chart.bar' },
    { id: 'history', label: 'History', icon: 'clock.arrow.circlepath' },
    ...(onOpenTechnique
      ? [
          {
            id: 'youtube',
            label: 'YouTube',
            icon: 'play.rectangle' as const,
            action: onOpenTechnique,
          },
        ]
      : []),
  ];

  const { data: totalRows } = useLiveQuery(exerciseTotalsQuery(id, range), [id, range]);
  const { data: sessions } = useLiveQuery(exerciseSessionsQuery(id), [id]);
  const { data: records } = useLiveQuery(exerciseRecordsQuery(id), [id]);
  const { data: setRows } = useLiveQuery(exerciseSetsQuery(id, HISTORY_SESSIONS), [id]);
  const { data: prRows } = useLiveQuery(exercisePrWorkoutsQuery(id), [id]);

  // Every section renders whether or not the exercise has been trained: an
  // empty one says so, where a missing one reads as a broken screen. `totals`
  // is one aggregate row, so it is absent only until the query first settles.
  const totals = totalRows?.[0] ?? EMPTY_TOTALS;

  const tiles = [
    { label: 'Sessions', value: String(totals.sessions), unit: undefined },
    { label: 'Sets', value: String(totals.completedSets), unit: undefined },
    ...totalsFor(type).map((kind) => totalMeasure(totals, kind, unit)),
  ];

  return (
    <View style={styles.stack}>
      <ExerciseTabs tabs={tabs} value={tab} onChange={select} />

      <Animated.View style={[styles.panel, panel]}>
        {tab === 'stats' ? (
          <>
            <View style={styles.totals}>
              <PeriodMenu value={period} periods={EXERCISE_PERIODS} onChange={setPeriod} />

              <View style={styles.tiles}>
                {tiles.map((tile) => (
                  <View key={tile.label} style={styles.tile}>
                    <View style={styles.measure}>
                      <ThemedText style={styles.tileValue} numberOfLines={1}>
                        {tile.value}
                      </ThemedText>
                      {tile.unit && (
                        <ThemedText type="small" themeColor="textSecondary">
                          {tile.unit}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {tile.label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <ExerciseRecords records={records ?? []} trackingType={type} unit={unit} />

            <ExerciseProgress sessions={sessions ?? []} trackingType={type} unit={unit} />
          </>
        ) : (
          <ExerciseHistory
            sessions={sessions ?? []}
            sets={setRows ?? []}
            prCounts={new Map((prRows ?? []).map((row) => [row.workoutId, row.records]))}
            trackingType={type}
            unit={unit}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  panel: {
    gap: Spacing.four,
  },
  totals: {
    gap: Spacing.three,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    gap: Spacing.half,
    alignItems: 'center',
  },
  measure: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  tileValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
});
