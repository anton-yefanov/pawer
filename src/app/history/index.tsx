import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/lib/weight-unit';
import { formatWeight, type WeightUnit } from '@/lib/units';
import { finishedWorkoutsQuery, type HistoryRow } from '@/lib/workout-queries';
import { formatElapsed, formatStartTime } from '@/lib/workout-stats';

export default function HistoryScreen() {
  const theme = useTheme();
  const unit = useWeightUnit();
  const router = useRouter();
  const { data } = useLiveQuery(finishedWorkoutsQuery(), []);

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      renderItem={({ item }) => (
        <HistoryCard
          workout={item}
          unit={unit}
          onOpen={() => router.push({ pathname: '/history/workout-details', params: { id: item.id } })}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <ThemedText style={styles.empty} themeColor="textSecondary">
          No finished workouts yet.
        </ThemedText>
      }
    />
  );
}

function HistoryCard({
  workout,
  unit,
  onOpen,
}: {
  workout: HistoryRow;
  unit: WeightUnit;
  onOpen: () => void;
}) {
  const theme = useTheme();

  const stats = [
    formatElapsed((workout.finishedAt ?? workout.startedAt) - workout.startedAt),
    `${workout.exerciseCount} ${workout.exerciseCount === 1 ? 'exercise' : 'exercises'}`,
    `${workout.completedSets} ${workout.completedSets === 1 ? 'set' : 'sets'}`,
  ];
  if (workout.volumeKg > 0) stats.push(formatWeight(workout.volumeKg, unit));

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}>
      <ThemedText numberOfLines={1}>{workout.name?.trim() || 'Workout'}</ThemedText>
      <View style={styles.dateRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatStartTime(workout.startedAt)}
        </ThemedText>
        {workout.prCount > 0 && (
          <PrChip label={`${workout.prCount} ${workout.prCount === 1 ? 'PR' : 'PRs'}`} />
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {stats.join(' · ')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  separator: {
    height: Spacing.two,
  },
  card: {
    gap: Spacing.half,
    borderRadius: 14,
    padding: Spacing.three,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.six,
  },
});
