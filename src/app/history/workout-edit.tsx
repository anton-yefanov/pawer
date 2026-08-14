import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutLogger } from '@/components/workout/workout-logger';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <WorkoutLogger
      id={id}
      mode="edit"
      onOpenExercise={(exerciseId) =>
        router.push({ pathname: '/history/workout-exercise', params: { id: exerciseId } })
      }
      onAddExercise={() => router.push({ pathname: '/history/workout-add-exercise', params: { id } })}
      onDone={() => router.back()}
    />
  );
}
