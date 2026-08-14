import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExerciseLibrary } from '@/components/exercise-library';
import { BigButton } from '@/components/workout/big-button';
import { SHEET_BOTTOM_INSET, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { addExerciseToWorkout } from '@/lib/workout-actions';

const FOOTER_HEIGHT = 50 + Spacing.three * 2;

export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [picked, setPicked] = useState<readonly string[]>([]);
  // Stable identity so the list's `extraData` only changes on a real toggle.
  const pickedSet = useMemo(() => new Set(picked), [picked]);

  const toggle = (exerciseId: string) =>
    setPicked((current) =>
      current.includes(exerciseId)
        ? current.filter((other) => other !== exerciseId)
        : [...current, exerciseId],
    );

  const confirm = async () => {
    // Sequential: each insert reads the current last position.
    for (const exerciseId of picked) await addExerciseToWorkout(id, exerciseId);
    router.back();
  };

  return (
    <>
      <ExerciseLibrary
        onSelect={(exercise) => toggle(exercise.id)}
        selectedIds={pickedSet}
        newExerciseHref="/new-exercise"
        detailHref={(exercise) => ({
          pathname: '/exercise/[id]',
          params: { id: exercise.id },
        })}
        topInset={SHEET_TOP_INSET}
        bottomInset={FOOTER_HEIGHT + SHEET_BOTTOM_INSET}
      />

      {picked.length > 0 && (
        // No entering animation: a Reanimated layout animation on the wrapper
        // stops the native glass view inside from drawing at all.
        <View style={[styles.footer, { paddingBottom: Spacing.three + SHEET_BOTTOM_INSET }]}>
          <BigButton
            title={`Add Exercise${picked.length > 1 ? 's' : ''}`}
            onPress={confirm}
            feedback="complete"
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
  },
});
