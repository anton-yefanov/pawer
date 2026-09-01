import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card, Separator } from '@/components/grouped-list';
import { WorkoutLogRow } from '@/components/history/workout-log-row';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIncludeWarmup } from '@/lib/warmup-stats';
import {
  finishedWorkoutExercisesQuery,
  finishedWorkoutsQuery,
  groupBy,
  type FinishedWorkoutExercise,
  type HistoryRow,
} from '@/lib/workout-queries';
import { formatMonth, monthKey } from '@/lib/workout-stats';

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const includeWarmup = useIncludeWarmup();
  const { data } = useLiveQuery(finishedWorkoutsQuery(includeWarmup), [includeWarmup]);
  const { data: exerciseRows } = useLiveQuery(finishedWorkoutExercisesQuery(includeWarmup), [
    includeWarmup,
  ]);

  // One join for the whole list, sliced per row here rather than a query per
  // workout.
  const byWorkout = useMemo(
    () => groupBy(exerciseRows ?? [], (row) => row.workoutId),
    [exerciseRows]
  );

  // The query is already newest-first, so the months come out in order for free.
  const months = useMemo(() => {
    const grouped = groupBy(data ?? [], (workout) => monthKey(workout.startedAt));
    return [...grouped].map(([key, workouts]) => ({ key, workouts }));
  }, [data]);

  return (
    <FlatList
      data={months}
      keyExtractor={(month) => month.key}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item }) => (
        <MonthSection
          workouts={item.workouts}
          exercisesFor={(id) => byWorkout.get(id) ?? []}
          onOpen={(id) =>
            router.push({ pathname: '/history/workout-details', params: { id } })
          }
        />
      )}
      ListEmptyComponent={
        <ThemedText style={styles.empty} themeColor="textSecondary">
          No finished workouts yet.
        </ThemedText>
      }
    />
  );
}

function MonthSection({
  workouts,
  exercisesFor,
  onOpen,
}: {
  workouts: HistoryRow[];
  exercisesFor: (workoutId: string) => readonly FinishedWorkoutExercise[];
  onOpen: (workoutId: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="footnote" weight="semibold" themeColor="textSecondary">
          {formatMonth(workouts[0].startedAt)}
        </ThemedText>
        <ThemedText type="footnote" weight="semibold" themeColor="textSecondary">
          {workouts.length} {workouts.length === 1 ? 'Workout' : 'Workouts'}
        </ThemedText>
      </View>
      <Card>
        {workouts.map((workout, index) => (
          <View key={workout.id}>
            {index > 0 && <Separator />}
            <WorkoutLogRow
              workout={workout}
              exercises={exercisesFor(workout.id)}
              onOpen={() => onOpen(workout.id)}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  section: {
    paddingBottom: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three * 2,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.six,
  },
});
