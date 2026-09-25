import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { SHEET_INNER_RADIUS } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { isPrKind, PR_LABELS } from '@/lib/personal-records';
import { isWorkSet } from '@/lib/set-types';
import { formatPreviousSet, trackingTypeOf } from '@/lib/tracking-types';
import { formatWeight, type WeightUnit } from '@/lib/units';
import { useIncludeWarmup } from '@/lib/warmup-stats';
import {
  groupBy,
  type WorkoutExerciseRow,
  type WorkoutPrRow,
  type WorkoutSetRow,
} from '@/lib/workout-queries';
import { formatElapsed, formatStartTime, type WorkoutSummary } from '@/lib/workout-stats';

/** The climb itself, and the wait for the card to have landed before it starts. */
const TALLY_MS = 720;
const TALLY_DELAY_MS = 180;

/**
 * Ramps 0 -> 1 on the JS thread, deliberately, so every figure can go up through
 * the ordinary formatters: `formatElapsed` and `formatWeight` own what a
 * duration and a weight look like, and a worklet copy of either would be a
 * second answer to that question living on the UI thread. The cost is a few
 * hundred milliseconds of text updates on a screen that is otherwise still.
 */
function useTally(enabled: boolean): number {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(enabled && !reduced ? 0 : 1);

  useEffect(() => {
    // Already 1 from the initializer in the ordinary case; this only matters
    // when Reduce Motion comes on mid-climb, and it is scheduled rather than
    // called here because a synchronous setState in an effect cascades renders.
    if (!enabled || reduced) {
      const settle = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(settle);
    }

    let frame: number | null = null;
    let started: number | null = null;
    const step = (now: number) => {
      started ??= now;
      const t = Math.min(1, (now - started) / TALLY_MS);
      // The same ease-out the blocks above settle on, so the figures decelerate
      // into place rather than stopping dead on their real values.
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(step);
    };

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, TALLY_DELAY_MS);

    return () => {
      clearTimeout(timer);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [enabled, reduced]);

  return progress;
}

/**
 * `tally` counts the figures up as the recap arrives. Off everywhere else: a
 * session reopened from History is a record being read, not one being finished.
 */
export function SummaryStats({
  summary,
  unit,
  tally = false,
  startedAt,
}: {
  summary: WorkoutSummary;
  unit: WeightUnit;
  tally?: boolean;
  /** Adds a Date row. The recap leaves it off — it just happened. */
  startedAt?: number;
}) {
  const theme = useTheme();
  const progress = useTally(tally);

  // At rest `progress` is exactly 1, so every figure is the same call it always
  // was — the climb can never leave a stat reading something the workout isn't.
  const stats = [
    ...(startedAt == null ? [] : ([[t('workout:stat.date'), formatStartTime(startedAt)]] as const)),
    [t('workout:stat.duration'), formatElapsed(summary.durationMs * progress)],
    [t('workout:stat.volume'), formatWeight(summary.volumeKg * progress, unit)],
    [t('workout:stat.sets'), String(Math.round(summary.completedSets * progress))],
    [t('workout:stat.exercises'), String(Math.round(summary.exerciseCount * progress))],
  ] as const;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {stats.map(([label, value]) => (
        <View key={label} style={styles.stat}>
          <ThemedText themeColor="textSecondary">{label}</ThemedText>
          <ThemedText type="headline" numeric numberOfLines={1} style={styles.statValue}>
            {value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/**
 * What was logged, one block per exercise. `showSets` expands each block into its
 * individual sets; without it only the completed count shows, which is all the
 * post-finish screen wants.
 */
export function ExerciseBreakdown({
  exercises,
  sets,
  personalRecords,
  unit,
  showSets = false,
}: {
  exercises: readonly WorkoutExerciseRow[];
  sets: readonly WorkoutSetRow[];
  personalRecords: readonly WorkoutPrRow[];
  unit: WeightUnit;
  showSets?: boolean;
}) {
  const theme = useTheme();
  const includeWarmup = useIncludeWarmup();
  if (exercises.length === 0) return null;

  const setsByExercise = groupBy(sets, (set) => set.workoutExerciseId);
  const recordsByExercise = groupBy(personalRecords, (record) => record.exerciseId);

  return (
    <View style={[styles.card, styles.exercises, { backgroundColor: theme.surface }]}>
      {exercises.map((exercise) => {
        const logged = (setsByExercise.get(exercise.id) ?? []).filter(
          (set) => set.completed && isWorkSet(set, includeWarmup)
        );
        const records = (recordsByExercise.get(exercise.exerciseId) ?? []).filter((record) =>
          isPrKind(record.kind)
        );
        // A set line owns the chips it earned; the header keeps the rest so a
        // record never disappears when the sets aren't shown.
        const onSets = showSets ? new Set(records.map((record) => record.setId)) : new Set<string>();
        const headerRecords = records.filter((record) => !onSets.has(record.setId));
        const trackingType = trackingTypeOf(exercise.trackingType);

        return (
          <View key={exercise.id} style={styles.exercise}>
            <View style={styles.exerciseHeader}>
              <ThemedText type="subhead" weight="semibold" numberOfLines={1} style={styles.exerciseName}>
                {exercise.name}
              </ThemedText>
              <ThemedText type="footnote" themeColor="textSecondary">
                {t('workout:setCount', { count: logged.length })}
              </ThemedText>
            </View>

            {headerRecords.length > 0 && (
              <View style={styles.chips}>
                {headerRecords.map((record) =>
                  isPrKind(record.kind) ? (
                    <PrChip key={record.id} label={PR_LABELS[record.kind]} />
                  ) : null
                )}
              </View>
            )}

            {showSets &&
              logged.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <ThemedText type="footnote" numeric themeColor="textTertiary" style={styles.setIndex}>
                    {index + 1}
                  </ThemedText>
                  <ThemedText type="footnote" style={styles.setValue}>
                    {formatPreviousSet(set, trackingType, unit)}
                  </ThemedText>
                  <View style={styles.setChips}>
                    {records
                      .filter((record) => record.setId === set.id)
                      .map((record) =>
                        isPrKind(record.kind) ? (
                          <PrChip key={record.id} label={PR_LABELS[record.kind]} />
                        ) : null
                      )}
                  </View>
                </View>
              ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SHEET_INNER_RADIUS,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  statValue: {
    flexShrink: 1,
  },
  exercises: {
    paddingVertical: Spacing.two,
  },
  exercise: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  exerciseName: {
    flexShrink: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  setIndex: {
    width: 18,
  },
  setValue: {
    flexShrink: 1,
  },
  setChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
});
