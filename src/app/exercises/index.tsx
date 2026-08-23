import { Stack } from 'expo-router';

import { ExerciseLibrary } from '@/components/exercise-library';
import { TAB_CONTENT_INSET } from '@/constants/navigation';

export default function ExercisesScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ExerciseLibrary newExerciseHref="/exercises/new" bottomInset={TAB_CONTENT_INSET} />
    </>
  );
}
