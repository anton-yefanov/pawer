import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { KeyboardDismissButton } from '@/components/keyboard-dismiss';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { ConfirmFinish } from '@/components/workout/confirm-finish';
import { ElapsedTime } from '@/components/workout/elapsed-time';
import { ExerciseCard } from '@/components/workout/exercise-card';
import {
  ExerciseReorderProvider,
  ReorderDim,
  type Settle,
} from '@/components/workout/exercise-reorder';
import { RestTimerButton } from '@/components/workout/rest-timer-button';
import {
  CloseButton,
  FinishButton,
  HeaderPillButton,
} from '@/components/workout/workout-sheet-header';
import { WorkoutDetailsCard } from '@/components/workout/workout-details-card';
import { WorkoutSummary } from '@/components/workout/workout-summary';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useProgressiveMount } from '@/hooks/use-progressive-mount';
import { useTheme } from '@/hooks/use-theme';
import { useLiveRows } from '@/lib/use-live-rows';
import { useWeightUnit } from '@/lib/weight-unit';
import * as haptics from '@/lib/haptics';
import type { LoggedSet, LoggingActions } from '@/lib/logging-model';
import { move, sortBy } from '@/lib/order';
import { presentFirstWorkoutPaywall } from '@/lib/pro-gates';
import { usePro } from '@/lib/purchases';
import { DEFAULT_REST_SECONDS, useRestTimer } from '@/lib/rest-timer';
import { supersetCandidates, supersetGroups } from '@/lib/supersets';
import { track } from '@/lib/telemetry';
import {
  addSet,
  cancelWorkout,
  completeUnfinishedSets,
  deleteSet,
  finishWorkout,
  joinWorkoutSuperset,
  leaveWorkoutSuperset,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  saveWorkoutEdits,
  setSetCompleted,
  setSetNotes,
  setSetType,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRest,
  updateSetValues,
} from '@/lib/workout-actions';
import {
  finishedWorkoutCount,
  groupBy,
  previousSetsQuery,
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { hasIncompleteValidSets, summarise, trackingByExercise } from '@/lib/workout-stats';

/**
 * Module scope keeps the identity stable without a hook. The superset pair is
 * missing on purpose: joining also repositions rows, so it has to clear the
 * optimistic drag order the screen holds.
 */
const WORKOUT_ACTIONS: Omit<LoggingActions, 'joinSuperset' | 'leaveSuperset'> = {
  addSet: (id) => void addSet(id),
  removeExercise: (id) => void removeWorkoutExercise(id),
  setExerciseNotes: (id, notes) => void setWorkoutExerciseNotes(id, notes),
  setExerciseRest: (id, seconds) => void setWorkoutExerciseRest(id, seconds),
  updateSetValues: (id, values) => void updateSetValues(id, values),
  setSetType: (id, setType) => void setSetType(id, setType),
  setSetNotes: (id, notes) => void setSetNotes(id, notes),
  deleteSet: (id) => void deleteSet(id),
};

/** What a sheet-height screen shows before the first scroll. */
const CARDS_ON_SCREEN = 2;

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
  onDone: () => void;
};

export function WorkoutLogger({ id, mode, onOpenExercise, onAddExercise, onDone }: Props) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const isPro = usePro();
  const rest = useRestTimer();

  const [phase, setPhase] = useState<'logging' | 'summary'>('logging');
  const [confirming, setConfirming] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [reordering, setReordering] = useState(false);

  /**
   * The order a drag just produced, applied on top of the live rows so the list
   * re-renders with the exercise in its new slot on release rather than a DB
   * round-trip later. It never needs clearing: once the write lands, the live
   * rows already match it and re-sorting is a no-op.
   */
  const [order, setOrder] = useState<string[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const viewportHeight = useRef(0);
  const restRowRef = useRef<View>(null);

  const workout = useLiveRows(() => workoutQuery(id), id)[0];
  const exercises = useLiveRows(() => workoutExercisesQuery(id), id);
  const sets = useLiveRows(() => workoutSetsQuery(id), id);
  const previous = useLiveRows(() => previousSetsQuery(id), id);
  const records = useLiveRows(() => workoutPersonalRecordsQuery(id), id);
  const mounted = useProgressiveMount(exercises.length, CARDS_ON_SCREEN);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  const setsByExercise = groupBy(sets, (set) => set.workoutExerciseId);
  const previousByExercise = groupBy(previous, (row) => row.exerciseId);
  const ordered = sortBy(exercises, order);
  const groups = supersetGroups(ordered);

  const actions: LoggingActions = {
    ...WORKOUT_ACTIONS,
    joinSuperset: (id, targetId) => {
      setOrder([]);
      void joinWorkoutSuperset(id, targetId);
    },
    leaveSuperset: (id) => void leaveWorkoutSuperset(id),
  };

  const reorder = (from: number, to: number, settle: Settle) => {
    const ids = move(
      ordered.map((row) => row.id),
      from,
      to,
    );
    setOrder(ids);
    settle();
    haptics.complete();
    void reorderWorkoutExercises(ids);
  };

  const complete = async (
    parent: { restSeconds: number | null; name: string },
    set: LoggedSet,
    completed: boolean,
  ) => {
    await setSetCompleted(set.id, completed);
    if (mode === 'edit') return;

    if (!completed) {
      if (rest.setId === set.id) await rest.cancel();
      return;
    }

    await rest.start({
      setId: set.id,
      seconds: parent.restSeconds ?? DEFAULT_REST_SECONDS,
      exerciseName: parent.name,
    });
  };

  /**
   * Measured on press rather than tracked: cards fold, sets are added and the
   * keyboard comes and goes while a rest runs, so any cached offset is stale by
   * the time the header button is tapped.
   */
  const scrollToRest = () => {
    const row = restRowRef.current;
    const content = contentRef.current;
    if (!row || !content) return;
    row.measureLayout(content, (_x, y, _width, height) => {
      const centred = y - (viewportHeight.current - height) / 2;
      scrollRef.current?.scrollTo({ y: Math.max(0, centred), animated: true });
    });
  };

  const finish = async () => {
    await rest.cancel();
    await finishWorkout(id);
    // Read the rows the finish just wrote rather than the live query, which
    // hasn't re-rendered yet — a PR outranks the plain finish buzz, and the
    // difference has to land with the haptic, not a tick later.
    const earned = await workoutPersonalRecordsQuery(id);
    if (earned.length > 0) haptics.reward();
    else haptics.complete();
    setPhase('summary');

    const totals = summarise(workout, exercises, sets);
    track('workout_finished', {
      duration_min: Math.round(totals.durationMs / 60_000),
      exercise_count: totals.exerciseCount,
      set_count: totals.completedSets,
      volume_kg: Math.round(totals.volumeKg),
      prs_earned: earned.length,
      workout_index: await finishedWorkoutCount(),
    });
  };

  const save = async () => {
    await saveWorkoutEdits(id);
    haptics.complete();
    onDone();
  };

  const cancel = async () => {
    await rest.cancel();
    await cancelWorkout(id);
    // Tracked here rather than in `cancelWorkout`, which `deleteWorkout` also
    // calls — deleting a finished session from history is not an abandonment.
    track('workout_cancelled', { had_sets: sets.some((set) => set.completed) });
    onDone();
  };

  const onCancelPressed = () => {
    const name = workout.name?.trim() ?? '';
    const empty =
      (name === '' || name === 'Workout') &&
      !workout.notes?.trim() &&
      exercises.length === 0;
    if (empty) void cancel();
    else setConfirmingCancel(true);
  };

  const onFinishPressed = () => {
    if (hasIncompleteValidSets(sets, trackingByExercise(exercises))) setConfirming(true);
    else setConfirmingFinish(true);
  };

  if (phase === 'summary') {
    return (
      <View style={[styles.page, { backgroundColor: theme.background }]}>
        <SheetHeader />
        <WorkoutSummary
          name={workout.name?.trim() || 'Workout'}
          summary={summarise(workout, exercises, sets)}
          exercises={exercises}
          sets={sets}
          personalRecords={records}
          unit={unit}
          // Presented over the summary rather than after it: a modal raised
          // into a dismissing screen is a modal iOS drops on the floor.
          onDone={async () => {
            await presentFirstWorkoutPaywall(isPro);
            onDone();
          }}
        />
      </View>
    );
  }

  return (
    <>
      <SheetHeader
        title={
          mode === 'edit' ? (
            workout.name?.trim() || 'Workout'
          ) : (
            <ElapsedTime startedAt={workout.startedAt} />
          )
        }
        left={
          mode === 'edit' ? (
            <CloseButton onPress={onDone} />
          ) : (
            <RestTimerButton onPress={scrollToRest} />
          )
        }
        right={
          mode === 'edit' ? (
            <HeaderPillButton title="Save" onPress={() => void save()} />
          ) : (
            <FinishButton onPress={onFinishPressed} />
          )
        }
      />

      <ExerciseReorderProvider
        count={ordered.length}
        onReorder={reorder}
        onReorderingChange={setReordering}>
        <KeyboardScrollView
          {...SHEET_SCROLL}
          scrollRef={scrollRef}
          onLayout={(event) => {
            viewportHeight.current = event.nativeEvent.layout.height;
          }}
          style={{ backgroundColor: theme.background }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // A lifted row moves with the finger; letting the content scroll under
          // it at the same time would put it somewhere the drop test can't see.
          scrollEnabled={!reordering}>
          {/* The padding lives on a real view rather than the content container
              so the resting row can be measured against it. */}
          <View ref={contentRef} style={styles.content}>
            <ReorderDim>
              <WorkoutDetailsCard workout={workout} />
            </ReorderDim>

            {ordered.slice(0, mounted).map((workoutExercise, index) => (
              <ExerciseCard
                key={workoutExercise.id}
                exercise={workoutExercise}
                index={index}
                sets={setsByExercise.get(workoutExercise.id) ?? []}
                previous={previousByExercise.get(workoutExercise.exerciseId) ?? []}
                unit={unit}
                defaultRestSeconds={DEFAULT_REST_SECONDS}
                restingSetId={rest.setId}
                restRowRef={restRowRef}
                actions={actions}
                supersetIndex={groups.get(workoutExercise.id)}
                supersetCandidates={supersetCandidates(ordered, workoutExercise)}
                onComplete={(set, completed) => complete(workoutExercise, set, completed)}
                onOpenExercise={onOpenExercise}
              />
            ))}

            <ReorderDim>
              <BigButton title="Add Exercise" symbol="plus.circle" onPress={onAddExercise} />
            </ReorderDim>

            {ordered.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                Add an exercise to start logging sets.
              </ThemedText>
            )}

            {mode === 'active' && (
              <ReorderDim>
                <BigButton title="Cancel Workout" variant="danger" onPress={onCancelPressed} />
              </ReorderDim>
            )}
          </View>
        </KeyboardScrollView>
      </ExerciseReorderProvider>

      <KeyboardDismissButton />

      <ConfirmAlert
        open={confirmingCancel}
        title="Cancel workout?"
        message="Are you sure you want to cancel this workout? All progress will be lost."
        confirmLabel="Cancel workout"
        dismissLabel="Don't cancel"
        onConfirm={() => {
          setConfirmingCancel(false);
          void cancel();
        }}
        onDismiss={() => setConfirmingCancel(false)}
      />

      <ConfirmAlert
        open={confirmingFinish}
        title="Finish workout?"
        confirmLabel="Finish"
        confirmRole="default"
        onConfirm={() => {
          setConfirmingFinish(false);
          void finish();
        }}
        onDismiss={() => setConfirmingFinish(false)}
      />
      <ConfirmFinish
        open={confirming}
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
  hint: {
    textAlign: 'center',
  },
});
