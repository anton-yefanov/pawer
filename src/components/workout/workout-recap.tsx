import { StyleSheet, View } from 'react-native';

import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
import { formatElapsed, type WorkoutSummary } from '@/lib/workout-stats';

export function SummaryStats({ summary, unit }: { summary: WorkoutSummary; unit: WeightUnit }) {
  const theme = useTheme();

  const stats = [
    ['Duration', formatElapsed(summary.durationMs)],
    ['Volume', formatWeight(summary.volumeKg, unit)],
    ['Sets', String(summary.completedSets)],
    ['Exercises', String(summary.exerciseCount)],
  ] as const;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {stats.map(([label, value]) => (
        <View key={label} style={styles.stat}>
          <ThemedText themeColor="textSecondary">{label}</ThemedText>
          <ThemedText type="headline" numeric>
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
                {logged.length} {logged.length === 1 ? 'set' : 'sets'}
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
                  <ThemedText type="footnote">
                    {formatPreviousSet(set, trackingType, unit)}
                  </ThemedText>
                  {records
                    .filter((record) => record.setId === set.id)
                    .map((record) =>
                      isPrKind(record.kind) ? (
                        <PrChip key={record.id} label={PR_LABELS[record.kind]} />
                      ) : null
                    )}
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
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  setIndex: {
    width: 18,
  },
});
