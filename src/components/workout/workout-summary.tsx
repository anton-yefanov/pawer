import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mascotImage } from '@/lib/mascot-images';
import { isPrKind, PR_LABELS } from '@/lib/personal-records';
import { formatWeight, type WeightUnit } from '@/lib/units';
import {
  groupBy,
  type WorkoutExerciseRow,
  type WorkoutPrRow,
  type WorkoutSetRow,
} from '@/lib/workout-queries';
import { formatElapsed, type WorkoutSummary as Summary } from '@/lib/workout-stats';

export function WorkoutSummary({
  name,
  summary,
  exercises,
  sets,
  personalRecords,
  unit,
  onDone,
}: {
  name: string;
  summary: Summary;
  exercises: readonly WorkoutExerciseRow[];
  sets: readonly WorkoutSetRow[];
  personalRecords: readonly WorkoutPrRow[];
  unit: WeightUnit;
  onDone: () => void;
}) {
  const theme = useTheme();

  const stats = [
    ['Duration', formatElapsed(summary.durationMs)],
    ['Volume', formatWeight(summary.volumeKg, unit)],
    ['Sets', String(summary.completedSets)],
    ['Exercises', String(summary.exerciseCount)],
  ] as const;

  const setsByExercise = groupBy(sets, (set) => set.workoutExerciseId);
  const recordsByExercise = groupBy(personalRecords, (record) => record.exerciseId);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={mascotImage('celebrating')} style={styles.mascot} contentFit="cover" />
        <ThemedText type="subtitle" style={styles.title}>
          Nice work
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.title}>
          {name}
        </ThemedText>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {stats.map(([label, value]) => (
            <View key={label} style={styles.stat}>
              <ThemedText themeColor="textSecondary">{label}</ThemedText>
              <ThemedText type="smallBold">{value}</ThemedText>
            </View>
          ))}
        </View>

        {exercises.length > 0 && (
          <View style={[styles.card, styles.exercises, { backgroundColor: theme.surface }]}>
            {exercises.map((exercise) => {
              const completed = (setsByExercise.get(exercise.id) ?? []).filter(
                (set) => set.completed
              ).length;
              const records = recordsByExercise.get(exercise.exerciseId) ?? [];

              return (
                <View key={exercise.id} style={styles.exercise}>
                  <View style={styles.exerciseHeader}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.exerciseName}>
                      {exercise.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {completed} {completed === 1 ? 'set' : 'sets'}
                    </ThemedText>
                  </View>

                  {records.length > 0 && (
                    <View style={styles.chips}>
                      {records.map((record) =>
                        isPrKind(record.kind) ? (
                          <PrChip key={record.id} label={PR_LABELS[record.kind]} />
                        ) : null
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <BigButton title="Done" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  mascot: {
    // The master is a square canvas letterboxing 4:3 art, so cover into a 4:3
    // box crops exactly the transparent bars.
    aspectRatio: 4 / 3,
    marginTop: -Spacing.three,
    marginHorizontal: -Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
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
  footer: {
    padding: Spacing.three,
  },
});
