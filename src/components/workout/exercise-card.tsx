import { Fragment, useRef, useState, type Ref } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import {
  COLLAPSED_ROW,
  useExerciseReorder,
  useLiftShadow,
  useRowMotion,
} from '@/components/workout/exercise-reorder';
import { ExerciseMenu } from '@/components/workout/exercise-menu';
import { NoteInput } from '@/components/workout/note-input';
import { RestCountdownRow } from '@/components/workout/rest-countdown-row';
import { fieldWidth, SET_COLUMNS, SetRow } from '@/components/workout/set-row';
import { SupersetBadge } from '@/components/workout/superset-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import type { LoggedExercise, LoggedSet, LoggingActions } from '@/lib/logging-model';
import { setLabels } from '@/lib/set-types';
import { headerLabel, TRACKING, trackingTypeOf } from '@/lib/tracking-types';
import { formatDuration, type WeightUnit } from '@/lib/units';
import type { PreviousSet } from '@/lib/workout-queries';

/** Long enough that a tap opens the exercise and a scroll flick doesn't lift it. */
const LIFT_DELAY = 250;

const dismissKeyboard = () => Keyboard.dismiss();

type Props = {
  exercise: LoggedExercise;
  index: number;
  sets: readonly LoggedSet[];
  previous: readonly PreviousSet[];
  unit: WeightUnit;
  defaultRestSeconds: number;
  actions: LoggingActions;
  /** Which superset colour this row wears; undefined when it is in none. */
  supersetIndex?: number;
  /** The other exercises in the session, its own superset aside. */
  supersetCandidates: readonly { id: string; name: string }[];
  onOpenExercise: (exerciseId: string) => void;
  /** Both logger-only: a template has nothing to tick and nothing resting. */
  onComplete?: (set: LoggedSet, completed: boolean) => void;
  restingSetId?: string | null;
  /** Only the one card holding the resting set ever attaches it. */
  restRowRef?: Ref<View>;
};

export function ExerciseCard({
  exercise,
  index,
  sets,
  previous,
  unit,
  defaultRestSeconds,
  actions,
  supersetIndex,
  supersetCandidates,
  onOpenExercise,
  onComplete,
  restingSetId,
  restRowRef,
}: Props) {
  const theme = useTheme();
  const [notesOpen, setNotesOpen] = useState(() => (exercise.notes ?? '') !== '');
  // Blurring the input on removal fires onEndEditing with the text still in it,
  // which would write the note straight back.
  const removingNote = useRef(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const restSeconds = exercise.restSeconds ?? defaultRestSeconds;
  const trackingType = trackingTypeOf(exercise.trackingType);
  const { fields } = TRACKING[trackingType];
  const labels = setLabels(sets);

  const reorder = useExerciseReorder();
  const motion = useRowMotion(exercise.id, index);
  const lift = useLiftShadow(exercise.id);
  const { progress } = reorder;

  // Carries the outcome from onEnd to onFinalize, which always runs.
  const committed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LIFT_DELAY)
    .onStart(() => {
      reorder.beginDrag(exercise.id, index);
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
              onPress={() => {
                haptics.tap();
                onOpenExercise(exercise.exerciseId);
              }}>
              {supersetIndex !== undefined && <SupersetBadge index={supersetIndex} />}
              <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                {exercise.name}
              </ThemedText>
            </Pressable>

            <Animated.View style={menuFade}>
              <ExerciseMenu
                restSeconds={exercise.restSeconds}
                defaultRestSeconds={defaultRestSeconds}
                hasNote={notesOpen}
                inSuperset={exercise.supersetId !== null}
                candidates={supersetCandidates}
                onToggleNote={() => {
                  if (!notesOpen) {
                    removingNote.current = false;
                    setNotesOpen(true);
                    return;
                  }
                  removingNote.current = true;
                  setNotesOpen(false);
                  actions.setExerciseNotes(exercise.id, null);
                }}
                onChangeRest={(seconds) => actions.setExerciseRest(exercise.id, seconds)}
                onJoinSuperset={(targetRowId) => {
                  haptics.select();
                  actions.joinSuperset(exercise.id, targetRowId);
                }}
                onLeaveSuperset={() => {
                  haptics.tap();
                  actions.leaveSuperset(exercise.id);
                }}
                // No confirmation step: the menu row is already marked destructive by
                // SwiftUI, and a system alert raised from inside a formSheet never
                // reaches the screen. The warning buzz stands in for it.
                onRemove={() => {
                  haptics.warn();
                  actions.removeExercise(exercise.id);
                }}
              />
            </Animated.View>

            <Animated.View style={[styles.grabber, grabberFade]} pointerEvents="none">
              <Icon name="line.3.horizontal" size={18} tintColor={theme.textSecondary} />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[styles.collapsible, bodyHeight > 0 && body]}>
        <View onLayout={(event) => measure(event, setBodyHeight)}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {notesOpen && (
              <NoteInput
                value={exercise.notes ?? ''}
                onCommit={(next) => {
                  if (removingNote.current) return;
                  actions.setExerciseNotes(exercise.id, next.trim() || null);
                }}
                placeholder="Notes"
                autoFocus={(exercise.notes ?? '') === ''}
                style={styles.notes}
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
                  style={{
                    width: fieldWidth(fields.length),
                    textAlign: 'center',
                  }}>
                  {headerLabel(field, trackingType, unit)}
                </ThemedText>
              ))}
              {onComplete && <View style={styles.columnCheck} />}
            </View>

            {sets.map((set, position) => (
              <Fragment key={set.id}>
                <SetRow
                  set={set}
                  label={labels[position]}
                  previous={previous[position]}
                  unit={unit}
                  trackingType={trackingType}
                  actions={actions}
                  onComplete={onComplete}
                />
                {restingSetId === set.id && <RestCountdownRow ref={restRowRef} />}
              </Fragment>
            ))}

            <Pressable
              onPress={() => {
                haptics.tap();
                actions.addSet(exercise.id);
              }}
              style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                + Add set
                {restSeconds > 0 ? ` (${formatDuration(restSeconds)})` : ''}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
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
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
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
