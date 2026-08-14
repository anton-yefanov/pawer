import { useLocalSearchParams } from 'expo-router';

import { EditExerciseSheet } from '@/components/exercises/edit-exercise-sheet';

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditExerciseSheet id={id} />;
}
