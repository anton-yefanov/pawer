import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutDetails } from '@/components/workout/workout-details';

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <WorkoutDetails
      id={id}
      onEdit={() => router.push({ pathname: '/history/workout-edit', params: { id } })}
      onOpenWorkout={(workoutId) =>
        router.push({ pathname: '/history/workout-active', params: { id: workoutId } })
      }
      onDeleted={() => router.back()}
    />
  );
}
