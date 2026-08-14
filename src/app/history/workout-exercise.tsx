import { useLocalSearchParams } from 'expo-router';

import { ExerciseDetail } from '@/components/exercise-detail';

export default function HistoryExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ExerciseDetail
      id={id}
      editHref={{ pathname: '/history/workout-exercise-edit', params: { id } }}
    />
  );
}
