import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { KeyboardDismissButton } from '@/components/keyboard-dismiss';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { SheetHeader } from '@/components/sheet-header';
import { SheetOverlay } from '@/components/sheet-overlay';
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
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useProgressiveMount } from '@/hooks/use-progressive-mount';
import { useTheme } from '@/hooks/use-theme';
import { useLiveRows } from '@/lib/use-live-rows';
import { useWeightUnit } from '@/lib/weight-unit';
import * as haptics from '@/lib/haptics';
import type { LoggedSet, LoggingActions } from '@/lib/logging-model';
import { attempt } from '@/lib/observability';
import { move, sortBy } from '@/lib/order';
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
import { groupBy, previousSetsQuery, workoutExercisesQuery, workoutQuery, workoutSetsQuery } from '@/lib/workout-queries';
import { hasIncompleteValidSets, trackingByExercise } from '@/lib/workout-stats';

/**
 * Module scope keeps the identity stable without a hook. The superset pair is
 * missing on purpose: joining also repositions rows, so it has to clear the
 * optimistic drag order the screen holds.
 */
const WORKOUT_ACTIONS: Omit<LoggingActions, 'joinSuperset' | 'leaveSuperset'> = {
  addSet: (id) => persist(addSet(id)),
  removeExercise: (id) => persist(removeWorkoutExercise(id)),
  setExerciseNotes: (id, notes) => persist(setWorkoutExerciseNotes(id, notes)),
  setExerciseRest: (id, seconds) => attempt('sets', setWorkoutExerciseRest(id, seconds)),
  updateSetValues: (id, values) => persist(updateSetValues(id, values)),
  setSetType: (id, setType) => persist(setSetType(id, setType)),
  setSetNotes: (id, notes) => persist(setSetNotes(id, notes)),
  deleteSet: (id) => persist(deleteSet(id)),
};

/**
 * Every one of these is fired from a tap or a keystroke and nothing awaits the
 * result, so before this a failed write simply left the row as it was — the
 * checkmark not ticking, the weight reverting on the next live-query pass — with
 * nothing said to the user and nothing recorded.
 */
function persist(work: Promise<unknown>): Promise<boolean> {
  return attempt('sets', work, {
    title: 'Couldn’t save',
    message: 'Your last change wasn’t saved. Please try again.',
  });
}

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
  /** Only ever called in `active` mode: the recap is a sheet of its own. */
  onFinished?: () => void;
};

export function WorkoutLogger({
  id,
  mode,
  onOpenExercise,
  onAddExercise,
  onDone,
  onFinished,
}: Props) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const rest = useRestTimer();

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
      return persist(joinWorkoutSuperset(id, targetId));
    },
    leaveSuperset: (id) => persist(leaveWorkoutSuperset(id)),
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
    void persist(reorderWorkoutExercises(ids)).then((written) => {
      // The new order is on screen before the write lands, so a failure would
      // otherwise leave the list showing an arrangement the database never took.
      if (!written) setOrder([]);
    });
  };

  const complete = async (
    parent: { restSeconds: number | null; name: string },
    set: LoggedSet,
    completed: boolean,
  ) => {
    if (!(await persist(setSetCompleted(set.id, completed)))) return;
    if (mode === 'edit') return;

    if (!completed) {
      if (rest.setId === set.id) await attempt('rest-timer', rest.cancel());
      return;
    }

    // The rest timer is a separate failure from the tick: the set is logged
    // either way, and a missing countdown must not read as a set that didn't
    // save.
    await attempt(
      'rest-timer',
      rest.start({
        setId: set.id,
        seconds: parent.restSeconds ?? DEFAULT_REST_SECONDS,
        exerciseName: parent.name,
      })
    );
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
    await attempt('rest-timer', rest.cancel());
    const finished = await attempt('workout', finishWorkout(id), {
      title: 'Couldn’t finish workout',
      message: 'Your sets are saved. Please try finishing again.',
    });
    if (!finished) return;

    onFinished?.();

    // Analytics records only that a workout finished. Workout totals, sets,
    // personal records, and exercise counts never leave the device.
    track('workout_finished', {});
  };

  const save = async () => {
    const saved = await attempt('workout', saveWorkoutEdits(id), {
      title: 'Couldn’t save changes',
      message: 'Please try again.',
    });
    if (!saved) return;
    haptics.complete();
    onDone();
  };

  const cancel = async () => {
    await attempt('rest-timer', rest.cancel());
    const cancelled = await attempt('workout', cancelWorkout(id), {
      title: 'Couldn’t discard workout',
      message: 'Please try again.',
    });
    if (!cancelled) return;
    // Tracked here rather than in `cancelWorkout`, which `deleteWorkout` also
    // calls — deleting a finished session from history is not an abandonment.
    track('workout_cancelled', {});
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



            {mode === 'active' && (
              <ReorderDim>
                <BigButton title="Cancel Workout" variant="danger" onPress={onCancelPressed} />
              </ReorderDim>
            )}
          </View>
        </KeyboardScrollView>
      </ExerciseReorderProvider>

      <SheetOverlay>
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
      </SheetOverlay>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: 240,
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
