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
        router.push({ pathname: '/workout-exercise', params: { id: exerciseId } })
      }
      onAddExercise={() => router.push({ pathname: '/workout-add-exercise', params: { id } })}
      onOpenTimer={() => router.push({ pathname: '/workout-timer' })}
      onDone={() => router.back()}
    />
  );
}
