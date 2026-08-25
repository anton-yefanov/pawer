import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseLibrary } from '@/components/exercise-library';
import { SheetGrabber } from '@/components/sheet-grabber';
import { SHEET_BOTTOM_INSET, SHEET_TOP_INSET } from '@/constants/sheet';
import { addExerciseToWorkout } from '@/lib/workout-actions';

export default function HistoryAddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      <SheetGrabber />

      <ExerciseLibrary
        topInset={SHEET_TOP_INSET}
        bottomInset={SHEET_BOTTOM_INSET}
        newExerciseHref="/history/new-exercise"
        detailHref={(exercise) => ({ pathname: '/history/workout-exercise', params: { id: exercise.id } })}
        onSelect={async (exercise) => {
          await addExerciseToWorkout(id, exercise.id);
          router.back();
        }}
      />
    </>
  );
}
