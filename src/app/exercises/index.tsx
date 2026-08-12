import { Stack } from 'expo-router';

import { ExerciseLibrary } from '@/components/exercise-library';

export default function ExercisesScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ExerciseLibrary newExerciseHref="/exercises/new" />
    </>
  );
}
