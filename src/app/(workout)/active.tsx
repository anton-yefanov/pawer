import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutStage } from '@/components/workout/workout-stage';

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <WorkoutStage
      id={id}
      onOpenExercise={(exerciseId) =>
        router.push({ pathname: '/exercise/[id]', params: { id: exerciseId } })
      }
      onAddExercise={() => router.push({ pathname: '/add-exercise', params: { id } })}
      onDone={() => router.back()}
    />
  );
}
