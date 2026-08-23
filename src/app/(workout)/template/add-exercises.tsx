import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { ExerciseLibrary } from '@/components/exercise-library';
import { SheetFooter } from '@/components/sheet-footer';
import { SHEET_FOOTER_HEIGHT } from '@/components/sheet-footer.types';
import { SheetGrabber } from '@/components/sheet-grabber';
import { BigButton } from '@/components/workout/big-button';
import { SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { addDraftExercises } from '@/lib/template-draft';

export default function AddTemplateExercisesScreen() {
  const [picked, setPicked] = useState<readonly string[]>([]);
  // Stable identity so the list's `extraData` only changes on a real toggle.
  const pickedSet = useMemo(() => new Set(picked), [picked]);

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id]
    );

  const confirm = () => {
    addDraftExercises(picked);
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
        bottomInset={(picked.length > 0 ? SHEET_FOOTER_HEIGHT : 0) + Spacing.three}
      />

      {picked.length > 0 && (
        <SheetFooter>
          <BigButton title={`Add ${picked.length}`} onPress={confirm} feedback="complete" />
        </SheetFooter>
      )}
    </>
  );
}
