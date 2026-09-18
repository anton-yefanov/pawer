import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Card, Separator } from '@/components/grouped-list';
import { WorkoutLogRow } from '@/components/history/workout-log-row';
import { Icon } from '@/components/icon';
import { TabTitle, TAB_TITLE_INSET } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { BigButton } from '@/components/workout/big-button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { guard } from '@/lib/observability';
import { useIncludeWarmup } from '@/lib/warmup-stats';
import { startEmptyWorkout } from '@/lib/workout-actions';
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
    [exerciseRows],
  );

  // The query is already newest-first, so the months come out in order for free.
  const months = useMemo(() => {
    const grouped = groupBy(data ?? [], (workout) => monthKey(workout.startedAt));
    return [...grouped].map(([key, workouts]) => ({ key, workouts }));
  }, [data]);

  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  // Presented inside this tab, like "Perform Again", rather than jumping to Home.
  const open = (id: string) => router.push({ pathname: '/history/workout-active', params: { id } });

  const startEmpty = async () => {
    const result = await guard('workout', startEmptyWorkout(), {
      title: 'Couldn’t start workout',
      message: 'Please try again.',
    });
    if (!result) return;
    if (result.status === 'blocked') {
      setBlockedBy(result.workoutId);
      return;
    }
    haptics.press();
    open(result.workoutId);
  };

  // Held back until the query answers, so a full history doesn't flash empty.
  const empty = data !== undefined && months.length === 0;

  return (
    <View style={styles.screen}>
      <FlatList
        data={months}
        keyExtractor={(month) => month.key}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingTop: TAB_TITLE_INSET }]}
        contentInsetAdjustmentBehavior="never"
        ListHeaderComponent={
          <View style={styles.title}>
            <TabTitle title="History" />
          </View>
        }
        renderItem={({ item }) => (
          <MonthSection
            workouts={item.workouts}
            exercisesFor={(id) => byWorkout.get(id) ?? []}
            onOpen={(id) =>
              router.push({
                pathname: '/history/workout-details',
                params: { id },
              })
            }
          />
        )}
        scrollEnabled={!empty}
      />
      {empty && (
        <View style={styles.empty} pointerEvents="box-none">
          <Icon name="clock.arrow.circlepath" size={64} tintColor={theme.textTertiary} />
          <ThemedText type="title2" weight="bold" style={styles.emptyTitle}>
            No Workouts Yet
          </ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.emptyText}>
            Every workout you finish lands here, with its sets, volume and records.
          </ThemedText>
          <View style={styles.emptyButton}>
            <BigButton title="Start an Empty Workout" onPress={() => void startEmpty()} />
          </View>
        </View>
      )}
      <ActiveWorkoutPrompt
        open={blockedBy != null}
        onResume={() => {
          const id = blockedBy;
          setBlockedBy(null);
          if (id) open(id);
        }}
        onDismiss={() => setBlockedBy(null)}
      />
    </View>
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
  title: {
    paddingHorizontal: Spacing.three,
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
  screen: { flex: 1 },
  // Laid over the whole screen rather than under the title, so the message sits
  // at the screen's true centre — as on Analytics.
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  emptyTitle: { marginTop: Spacing.three, textAlign: 'center' },
  emptyText: { marginTop: Spacing.two, maxWidth: 280, textAlign: 'center' },
  emptyButton: { marginTop: Spacing.four },
});
