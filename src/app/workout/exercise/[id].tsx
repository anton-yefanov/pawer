import { useLocalSearchParams } from 'expo-router';

import { ExerciseDetail } from '@/components/exercise-detail';

export default function WorkoutExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetail id={id} />;
}
