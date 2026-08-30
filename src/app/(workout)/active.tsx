import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutLogger } from '@/components/workout/workout-logger';
import { presentWorkoutSummary } from '@/lib/workout-summary-route';

export default function ActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <WorkoutLogger
      id={id}
      mode="active"
      onOpenExercise={(exerciseId) =>
        router.push({ pathname: '/exercise/[id]', params: { id: exerciseId } })
      }
      onAddExercise={() => router.push({ pathname: '/add-exercise', params: { id } })}
      onDone={() => router.back()}
      onFinished={() => presentWorkoutSummary(id, '/summary')}
    />
  );
}
