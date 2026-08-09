import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { ConfirmFinish } from '@/components/workout/confirm-finish';
import { ElapsedTime } from '@/components/workout/elapsed-time';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { ClockButton, FinishButton, HeaderSlot } from '@/components/workout/workout-sheet-header';
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

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const unit = useWeightUnit();
  const rest = useRestTimer();

  const [phase, setPhase] = useState<'logging' | 'summary'>('logging');
  const [confirming, setConfirming] = useState(false);

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
          onDone={() => router.back()}
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
              <ClockButton onPress={() => router.push({ pathname: '/workout/timer' })} />
            </HeaderSlot>
          ),
          headerTitle: () => <ElapsedTime startedAt={workout.startedAt} />,
          headerRight: () => (
            <HeaderSlot>
              <FinishButton onPress={onFinishPressed} />
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
          />
        ))}

        <BigButton
          title="Add Exercise"
          symbol="plus.circle"
          variant="tinted"
          onPress={() => router.push({ pathname: '/workout/add-exercise', params: { id } })}
        />

        {(exercises ?? []).length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Add an exercise to start logging sets.
          </ThemedText>
        )}
      </ScrollView>

      {confirming && (
        <ConfirmFinish
          onCompleteUnfinished={async () => {
            setConfirming(false);
            await completeUnfinishedSets(id);
            await finish();
          }}
          onCancelWorkout={async () => {
            setConfirming(false);
            await rest.cancel();
            await cancelWorkout(id);
            router.back();
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
