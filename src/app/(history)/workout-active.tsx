import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutLogger } from '@/components/workout/workout-logger';

/**
 * "Perform Again" starts a session from inside the History tab. It presents here
 * rather than jumping to the Workout tab — dismissing a sheet and presenting
 * another across tabs in one tick is what workout/_layout.tsx warns against. The
 * Workout tab still picks the session up as "Resume Workout".
 */
export default function HistoryActiveWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <WorkoutLogger
      id={id}
      mode="active"
      onOpenExercise={(exerciseId) =>
        router.push({ pathname: '/workout-exercise', params: { id: exerciseId } })
      }
      onAddExercise={() => router.push({ pathname: '/workout-add-exercise', params: { id } })}
      onOpenTimer={() => router.push({ pathname: '/workout-timer' })}
      onDone={() => router.back()}
    />
  );
}
