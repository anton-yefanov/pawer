import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { ConfirmFinish } from '@/components/workout/confirm-finish';
import { ElapsedTime } from '@/components/workout/elapsed-time';
import { ExerciseCard } from '@/components/workout/exercise-card';
import {
  ClockButton,
  CloseButton,
  FinishButton,
  HeaderPillButton,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { WorkoutDetailsCard } from '@/components/workout/workout-details-card';
import { WorkoutSummary } from '@/components/workout/workout-summary';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/hooks/use-weight-unit';
import { mascotImage } from '@/lib/mascot-images';
import { DEFAULT_REST_SECONDS, useRestTimer } from '@/lib/rest-timer';
import {
  cancelWorkout,
  completeUnfinishedSets,
  finishWorkout,
  saveWorkoutEdits,
  setSetCompleted,
} from '@/lib/workout-actions';
import {
  groupBy,
  previousSetsQuery,
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
  type WorkoutSetRow,
} from '@/lib/workout-queries';
import {
  hasIncompleteValidSets,
  mascotStateFor,
  summarise,
  trackingByExercise,
} from '@/lib/workout-stats';

type Props = {
  id: string;
  /**
   * `edit` reopens a workout that is already finished: same logging surface, but
   * it saves instead of finishing and never starts a rest timer — a past session
   * has no next set to schedule a notification for.
   */
  mode: 'active' | 'edit';
  onOpenExercise: (exerciseId: string) => void;
  onAddExercise: () => void;
  onOpenTimer: () => void;
  onDone: () => void;
};

export function WorkoutLogger({
  id,
  mode,
  onOpenExercise,
  onAddExercise,
  onOpenTimer,
  onDone,
}: Props) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const rest = useRestTimer();

  const [phase, setPhase] = useState<'logging' | 'summary'>('logging');
  const [confirming, setConfirming] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const workout = useLiveQuery(workoutQuery(id), [id]).data?.[0];
  const { data: exercises } = useLiveQuery(workoutExercisesQuery(id), [id]);
  const { data: sets } = useLiveQuery(workoutSetsQuery(id), [id]);
  const { data: previous } = useLiveQuery(previousSetsQuery(id), [id]);
  const { data: records } = useLiveQuery(workoutPersonalRecordsQuery(id), [id]);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.surfaceGrouped }} />;

  const setsByExercise = groupBy(sets ?? [], (set) => set.workoutExerciseId);
  const previousByExercise = groupBy(previous ?? [], (row) => row.exerciseId);

  const complete = async (set: WorkoutSetRow, completed: boolean) => {
    await setSetCompleted(set.id, completed);
    if (mode === 'edit') return;

    if (!completed) {
      if (rest.setId === set.id) await rest.cancel();
      return;
    }

    const parent = exercises?.find((row) => row.id === set.workoutExerciseId);
    await rest.start({
      setId: set.id,
      seconds: parent?.restSeconds ?? DEFAULT_REST_SECONDS,
      exerciseName: parent?.name ?? 'Next set',
    });
  };

  const finish = async () => {
    await rest.cancel();
    await finishWorkout(id);
    setPhase('summary');
  };

  const save = async () => {
    await saveWorkoutEdits(id);
    onDone();
  };

  const cancel = async () => {
    await rest.cancel();
    await cancelWorkout(id);
    onDone();
  };

  const onCancelPressed = () => {
    if ((exercises ?? []).length > 0) setConfirmingCancel(true);
    else void cancel();
  };

  const onFinishPressed = () => {
    if (hasIncompleteValidSets(sets ?? [], trackingByExercise(exercises ?? []))) setConfirming(true);
    else void finish();
  };

  if (phase === 'summary') {
    return (
      <View style={[styles.page, { backgroundColor: theme.surfaceGrouped }]}>
        <Stack.Screen
          options={{
            headerLeft: () => null,
            headerTitle: () => null,
            headerRight: () => null,
          }}
        />
        <WorkoutSummary
          name={workout.name?.trim() || 'Workout'}
          summary={summarise(workout, exercises ?? [], sets ?? [])}
          exercises={exercises ?? []}
          sets={sets ?? []}
          personalRecords={records ?? []}
          unit={unit}
          onDone={onDone}
        />
      </View>
    );
  }

  const mascot = mascotStateFor({
    finished: false,
    resting: rest.setId != null,
    hasProgress: (sets ?? []).some((set) => set.completed),
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderSlot>
              {mode === 'edit' ? (
                <CloseButton onPress={onDone} />
              ) : (
                <ClockButton onPress={onOpenTimer} />
              )}
            </HeaderSlot>
          ),
          headerTitle: () =>
            mode === 'edit' ? (
              <ThemedText type="smallBold" numberOfLines={1}>
                {workout.name?.trim() || 'Workout'}
              </ThemedText>
            ) : (
              <ElapsedTime startedAt={workout.startedAt} />
            ),
          headerRight: () => (
            <HeaderSlot>
              {mode === 'edit' ? (
                <HeaderPillButton title="Save" onPress={() => void save()} />
              ) : (
                <FinishButton onPress={onFinishPressed} />
              )}
            </HeaderSlot>
          ),
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.surfaceGrouped }}
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <Image source={mascotImage(mascot)} style={styles.mascot} contentFit="contain" />

        <WorkoutDetailsCard workout={workout} />

        {(exercises ?? []).map((workoutExercise) => (
          <ExerciseCard
            key={workoutExercise.id}
            workoutExercise={workoutExercise}
            sets={setsByExercise.get(workoutExercise.id) ?? []}
            previous={previousByExercise.get(workoutExercise.exerciseId) ?? []}
            unit={unit}
            defaultRestSeconds={DEFAULT_REST_SECONDS}
            restingSetId={rest.setId}
            onComplete={complete}
            onOpenExercise={onOpenExercise}
          />
        ))}

        <BigButton
          title="Add Exercise"
          symbol="plus.circle"
          variant="tinted"
          onPress={onAddExercise}
        />

        {(exercises ?? []).length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Add an exercise to start logging sets.
          </ThemedText>
        )}

        {mode === 'active' && (
          <BigButton title="Cancel Workout" variant="danger" onPress={onCancelPressed} />
        )}
      </ScrollView>

      <ConfirmAlert
        open={confirmingCancel}
        title="Cancel workout?"
        message="You have unfinished sets."
        confirmLabel="Cancel workout"
        dismissLabel="Don't cancel"
        onConfirm={() => {
          setConfirmingCancel(false);
          void cancel();
        }}
        onDismiss={() => setConfirmingCancel(false)}
      />

      {confirming && (
        <ConfirmFinish
          onCompleteUnfinished={async () => {
            setConfirming(false);
            await completeUnfinishedSets(id);
            await finish();
          }}
          onCancelWorkout={async () => {
            setConfirming(false);
            await cancel();
          }}
          onDismiss={() => setConfirming(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: 240,
    gap: Spacing.three,
  },
  mascot: {
    width: 120,
    height: 120,
    alignSelf: 'center',
  },
  hint: {
    textAlign: 'center',
  },
});
