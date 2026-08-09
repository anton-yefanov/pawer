import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardMenu } from '@/components/templates/card-menu';
import { type ConfirmDestructive } from '@/components/templates/card-actions';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
import { HeaderSlot } from '@/components/workout/workout-sheet-header';
import { workoutActions } from '@/components/workout/workout-menu-actions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/hooks/use-weight-unit';
import {
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { formatStartTime, summarise } from '@/lib/workout-stats';

type Pending = { title: string; body: string; onConfirm: () => void };

export function WorkoutDetails({
  id,
  onEdit,
  onOpenWorkout,
  onDeleted,
}: {
  id: string;
  onEdit: () => void;
  onOpenWorkout: (workoutId: string) => void;
  onDeleted: () => void;
}) {
  const theme = useTheme();
  const unit = useWeightUnit();

  const workout = useLiveQuery(workoutQuery(id), [id]).data?.[0];
  const { data: exercises } = useLiveQuery(workoutExercisesQuery(id), [id]);
  const { data: sets } = useLiveQuery(workoutSetsQuery(id), [id]);
  const { data: records } = useLiveQuery(workoutPersonalRecordsQuery(id), [id]);

  const [pending, setPending] = useState<Pending | null>(null);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.surfaceGrouped }} />;

  const confirm: ConfirmDestructive = (options) => setPending(options);

  const actions = workoutActions(workout, {
    onEdit,
    onRepeat: (result) => {
      if (result.status === 'blocked') setBlockedBy(result.workoutId);
      else onOpenWorkout(result.workoutId);
    },
    onDeleted,
    confirm,
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: workout.name?.trim() || 'Workout',
          headerRight: () => (
            <HeaderSlot>
              <CardMenu accessibilityLabel="Workout options" actions={actions} />
            </HeaderSlot>
          ),
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.surfaceGrouped }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <ThemedText type="small" themeColor="textSecondary">
          {formatStartTime(workout.startedAt)}
        </ThemedText>

        <SummaryStats summary={summarise(workout, exercises ?? [], sets ?? [])} unit={unit} />

        <ExerciseBreakdown
          exercises={exercises ?? []}
          sets={sets ?? []}
          personalRecords={records ?? []}
          unit={unit}
          showSets
        />
      </ScrollView>

      <ConfirmAlert
        open={pending != null}
        title={pending?.title ?? ''}
        message={pending?.body ?? ''}
        confirmLabel="Delete"
        onConfirm={() => {
          pending?.onConfirm();
          setPending(null);
        }}
        onDismiss={() => setPending(null)}
      />

      {blockedBy && (
        <ActiveWorkoutPrompt
          onResume={() => {
            setBlockedBy(null);
            onOpenWorkout(blockedBy);
          }}
          onDismiss={() => setBlockedBy(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
