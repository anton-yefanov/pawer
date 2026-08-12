import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import {
  COLLAPSED_ROW,
  useExerciseReorder,
  useLiftShadow,
  useRowMotion,
} from '@/components/workout/exercise-reorder';
import { ExerciseMenu } from '@/components/workout/exercise-menu';
import { RestCountdownRow } from '@/components/workout/rest-countdown-row';
import { fieldWidth, SET_COLUMNS, SetRow } from '@/components/workout/set-row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setLabels } from '@/lib/set-types';
import { headerLabel, TRACKING, trackingTypeOf } from '@/lib/tracking-types';
import { formatDuration, type WeightUnit } from '@/lib/units';
import {
  addSet,
  removeWorkoutExercise,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRest,
} from '@/lib/workout-actions';
import type { PreviousSet, WorkoutExerciseRow, WorkoutSetRow } from '@/lib/workout-queries';

/** Long enough that a tap opens the exercise and a scroll flick doesn't lift it. */
const LIFT_DELAY = 250;

const dismissKeyboard = () => Keyboard.dismiss();

type Props = {
  workoutExercise: WorkoutExerciseRow;
  index: number;
  sets: readonly WorkoutSetRow[];
  previous: readonly PreviousSet[];
  unit: WeightUnit;
  defaultRestSeconds: number;
  restingSetId: string | null;
  onComplete: (set: WorkoutSetRow, completed: boolean) => void;
  onOpenExercise: (exerciseId: string) => void;
};

export function ExerciseCard({
  workoutExercise,
  index,
  sets,
  previous,
  unit,
  defaultRestSeconds,
  restingSetId,
  onComplete,
  onOpenExercise,
}: Props) {
  const theme = useTheme();
  const [notesOpen, setNotesOpen] = useState(() => (workoutExercise.notes ?? '') !== '');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const restSeconds = workoutExercise.restSeconds ?? defaultRestSeconds;
  const trackingType = trackingTypeOf(workoutExercise.trackingType);
  const { fields } = TRACKING[trackingType];
  const labels = setLabels(sets);

  const reorder = useExerciseReorder();
  const motion = useRowMotion(workoutExercise.id, index);
  const lift = useLiftShadow(workoutExercise.id);
  const { progress } = reorder;

  // Carries the outcome from onEnd to onFinalize, which always runs.
  const committed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LIFT_DELAY)
    .onStart(() => {
      reorder.beginDrag(workoutExercise.id, index);
      runOnJS(reorder.setReordering)(true);
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((event) => {
      reorder.moveDrag(event.translationY);
    })
    .onEnd(() => {
      const to = reorder.dropIndex.value;
      if (to >= 0 && to !== index) {
        runOnJS(reorder.reorder)(index, to);
        committed.value = true;
      }
    })
    .onFinalize(() => {
      reorder.endDrag(committed.value);
      committed.value = false;
      runOnJS(reorder.setReordering)(false);
    });

  const chip = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [headerHeight, COLLAPSED_ROW]),
    borderRadius: interpolate(progress.value, [0, 1], [0, 12]),
    paddingHorizontal: interpolate(progress.value, [0, 1], [0, Spacing.two]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [theme.background, theme.surface]),
  }));

  const body = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [bodyHeight, 0]),
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
  }));

  /**
   * Only an unfolded row can be measured. A folded one is clipped to nothing,
   * so the view inside it reports a height of zero — and taking that would drop
   * the animated height, leaving the row stuck at the zero the animation had
   * already written to it.
   */
  const measure = (event: LayoutChangeEvent, apply: (height: number) => void) => {
    const { height } = event.nativeEvent.layout;
    if (progress.value === 0 && height > 0) apply(height);
  };

  const menuFade = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const grabberFade = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    // The shadow sits out here rather than on the chip, which clips its own
    // layer shadow away with the `overflow: hidden` that hides the folded name.
    <Animated.View style={[styles.row, { shadowColor: theme.shadow }, motion, lift]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.chip, headerHeight > 0 && chip]}>
          <View style={styles.header} onLayout={(event) => measure(event, setHeaderHeight)}>
            <Pressable
              style={styles.title}
              onPress={() => onOpenExercise(workoutExercise.exerciseId)}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {workoutExercise.name}
              </ThemedText>
            </Pressable>

            <Animated.View style={menuFade}>
              <ExerciseMenu
                restSeconds={workoutExercise.restSeconds}
                defaultRestSeconds={defaultRestSeconds}
                onAddNote={() => setNotesOpen(true)}
                onChangeRest={(seconds) => setWorkoutExerciseRest(workoutExercise.id, seconds)}
                // No confirmation step: the menu row is already marked destructive by
                // SwiftUI, and a system alert raised from inside a formSheet never
                // reaches the screen.
                onRemove={() => removeWorkoutExercise(workoutExercise.id)}
              />
            </Animated.View>

            <Animated.View style={[styles.grabber, grabberFade]} pointerEvents="none">
              <SymbolView name="line.3.horizontal" size={18} tintColor={theme.textSecondary} />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[styles.collapsible, bodyHeight > 0 && body]}>
        <View onLayout={(event) => measure(event, setBodyHeight)}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {notesOpen && (
              <TextInput
                defaultValue={workoutExercise.notes ?? ''}
                onEndEditing={(event) =>
                  setWorkoutExerciseNotes(workoutExercise.id, event.nativeEvent.text.trim() || null)
                }
                placeholder="Notes"
                placeholderTextColor={theme.textSecondary}
                multiline
                autoFocus={(workoutExercise.notes ?? '') === ''}
                style={[styles.notes, { color: theme.text }]}
              />
            )}

            <View style={styles.columns}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.columnSet}>
                Set
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.columnPrevious}>
                Previous
              </ThemedText>
              {fields.map((field) => (
                <ThemedText
                  key={field}
                  type="small"
                  themeColor="textSecondary"
                  style={{ width: fieldWidth(fields.length), textAlign: 'center' }}>
                  {headerLabel(field, trackingType, unit)}
                </ThemedText>
              ))}
              <View style={styles.columnCheck} />
            </View>

            {sets.map((set, position) => (
              <Fragment key={set.id}>
                <SetRow
                  set={set}
                  label={labels[position]}
                  previous={previous[position]}
                  unit={unit}
                  trackingType={trackingType}
                  onComplete={onComplete}
                />
                {restingSetId === set.id && <RestCountdownRow />}
              </Fragment>
            ))}

            <Pressable
              onPress={() => addSet(workoutExercise.id)}
              style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                + Add set{restSeconds > 0 ? ` (${formatDuration(restSeconds)})` : ''}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  chip: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.one,
  },
  title: {
    flex: 1,
  },
  grabber: {
    position: 'absolute',
    right: Spacing.one,
  },
  // The gap between a name and its sets folds away with the sets themselves, so
  // it lives inside the collapsing container rather than on a wrapper.
  collapsible: {
    overflow: 'hidden',
  },
  card: {
    marginTop: Spacing.one,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    overflow: 'hidden',
  },
  notes: {
    fontSize: 14,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    minHeight: 32,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  columnSet: {
    width: SET_COLUMNS.set,
    textAlign: 'center',
  },
  columnPrevious: {
    flex: 1,
    textAlign: 'center',
  },
  columnCheck: {
    width: SET_COLUMNS.check - 8,
  },
  addSet: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.one,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.6,
  },
});
