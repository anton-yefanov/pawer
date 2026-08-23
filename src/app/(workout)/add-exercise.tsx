import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { ExerciseLibrary } from '@/components/exercise-library';
import { SheetFooter } from '@/components/sheet-footer';
import { SHEET_FOOTER_HEIGHT } from '@/components/sheet-footer.types';
import { SheetGrabber } from '@/components/sheet-grabber';
import { BigButton } from '@/components/workout/big-button';
import { SHEET_BOTTOM_INSET, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { addExerciseToWorkout } from '@/lib/workout-actions';

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
      <SheetGrabber />

      <ExerciseLibrary
        onSelect={(exercise) => toggle(exercise.id)}
        selectedIds={pickedSet}
        newExerciseHref="/new-exercise"
        detailHref={(exercise) => ({
          pathname: '/exercise/[id]',
          params: { id: exercise.id },
        })}
        topInset={SHEET_TOP_INSET}
        bottomInset={(picked.length > 0 ? SHEET_FOOTER_HEIGHT : 0) + SHEET_BOTTOM_INSET}
      />

      {picked.length > 0 && (
        // No entering animation: a Reanimated layout animation on the wrapper
        // stops the native glass view inside from drawing at all.
        <SheetFooter style={{ paddingBottom: Spacing.three + SHEET_BOTTOM_INSET }}>
          <BigButton
            title={`Add Exercise${picked.length > 1 ? 's' : ''}`}
            onPress={confirm}
            feedback="complete"
          />
        </SheetFooter>
      )}
    </>
  );
}
