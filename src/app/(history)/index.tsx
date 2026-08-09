import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CardMenu } from '@/components/templates/card-menu';
import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { workoutActions } from '@/components/workout/workout-menu-actions';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/hooks/use-weight-unit';
import { formatWeight, type WeightUnit } from '@/lib/units';
import { finishedWorkoutsQuery, type HistoryRow } from '@/lib/workout-queries';
import { formatElapsed, formatStartTime } from '@/lib/workout-stats';

export default function HistoryScreen() {
  const theme = useTheme();
  const unit = useWeightUnit();
  const router = useRouter();
  const { data } = useLiveQuery(finishedWorkoutsQuery(), []);

  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  const openWorkout = (id: string) =>
    router.push({ pathname: '/workout-active', params: { id } });

  return (
    <>
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
            onOpen={() => router.push({ pathname: '/workout-details', params: { id: item.id } })}
            onEdit={() => router.push({ pathname: '/workout-edit', params: { id: item.id } })}
            onRepeat={(workoutId, blocked) =>
              blocked ? setBlockedBy(workoutId) : openWorkout(workoutId)
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <ThemedText style={styles.empty} themeColor="textSecondary">
            No finished workouts yet.
          </ThemedText>
        }
      />

      {blockedBy && (
        <ActiveWorkoutPrompt
          onResume={() => {
            setBlockedBy(null);
            openWorkout(blockedBy);
          }}
          onDismiss={() => setBlockedBy(null)}
        />
      )}
    </>
  );
}

function HistoryCard({
  workout,
  unit,
  onOpen,
  onEdit,
  onRepeat,
}: {
  workout: HistoryRow;
  unit: WeightUnit;
  onOpen: () => void;
  onEdit: () => void;
  onRepeat: (workoutId: string, blocked: boolean) => void;
}) {
  const theme = useTheme();

  const stats = [
    formatElapsed((workout.finishedAt ?? workout.startedAt) - workout.startedAt),
    `${workout.exerciseCount} ${workout.exerciseCount === 1 ? 'exercise' : 'exercises'}`,
    `${workout.completedSets} ${workout.completedSets === 1 ? 'set' : 'sets'}`,
  ];
  if (workout.volumeKg > 0) stats.push(formatWeight(workout.volumeKg, unit));

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.cardText, pressed && styles.pressed]}>
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

      <CardMenu
        accessibilityLabel={`${workout.name?.trim() || 'Workout'} options`}
        actions={workoutActions(workout, {
          onEdit,
          onRepeat: (result) => onRepeat(result.workoutId, result.status === 'blocked'),
        })}
      />
    </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: 14,
    padding: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
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
