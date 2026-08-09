import { useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ExerciseMenu } from '@/components/workout/exercise-menu';
import { RestCountdownRow } from '@/components/workout/rest-countdown-row';
import { fieldWidth, SET_COLUMNS, SetRow } from '@/components/workout/set-row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { headerLabel, TRACKING, trackingTypeOf } from '@/lib/tracking-types';
import { formatDuration, type WeightUnit } from '@/lib/units';
import {
  addSet,
  removeWorkoutExercise,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRest,
} from '@/lib/workout-actions';
import type { PreviousSet, WorkoutExerciseRow, WorkoutSetRow } from '@/lib/workout-queries';

type Props = {
  workoutExercise: WorkoutExerciseRow;
  sets: readonly WorkoutSetRow[];
  previous: readonly PreviousSet[];
  unit: WeightUnit;
  defaultRestSeconds: number;
  restingSetId: string | null;
  onComplete: (set: WorkoutSetRow, completed: boolean) => void;
};

export function ExerciseCard({
  workoutExercise,
  sets,
  previous,
  unit,
  defaultRestSeconds,
  restingSetId,
  onComplete,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [notesOpen, setNotesOpen] = useState(() => (workoutExercise.notes ?? '') !== '');
  const restSeconds = workoutExercise.restSeconds ?? defaultRestSeconds;
  const trackingType = trackingTypeOf(workoutExercise.trackingType);
  const { fields } = TRACKING[trackingType];

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable
          style={styles.title}
          onPress={() =>
            router.push({
              pathname: '/workout/exercise/[id]',
              params: { id: workoutExercise.exerciseId },
            })
          }>
          <ThemedText type="smallBold" numberOfLines={1}>
            {workoutExercise.name}
          </ThemedText>
        </Pressable>

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
      </View>

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
              style={{ width: fieldWidth(field, fields.length), textAlign: 'center' }}>
              {headerLabel(field, trackingType, unit)}
            </ThemedText>
          ))}
          <View style={styles.columnCheck} />
        </View>

        {sets.map((set, index) => (
          <Fragment key={set.id}>
            <SetRow
              set={set}
              index={index}
              previous={previous[index]}
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.one,
  },
  title: {
    flex: 1,
  },
  card: {
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
