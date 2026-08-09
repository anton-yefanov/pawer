import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseLibrary } from '@/components/exercise-library';
import { Spacing } from '@/constants/theme';
import { addExerciseToWorkout } from '@/lib/workout-actions';

export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ExerciseLibrary
        bottomInset={Spacing.four}
        topInset={0}
        onSelect={async (exercise) => {
          await addExerciseToWorkout(id, exercise.id);
          router.back();
        }}
      />
    </>
  );
}
