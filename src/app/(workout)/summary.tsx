import { useLocalSearchParams } from 'expo-router';

import { WorkoutSummary } from '@/components/workout/workout-summary';

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutSummary id={id} />;
}
