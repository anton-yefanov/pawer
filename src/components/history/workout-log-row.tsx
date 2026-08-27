import { Pressable, StyleSheet, View } from 'react-native';

import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import type { FinishedWorkoutExercise, HistoryRow } from '@/lib/workout-queries';
import { formatHoursMinutes } from '@/lib/workout-stats';

const MAX_LINES = 6;

export function WorkoutLogRow({
  workout,
  exercises,
  onOpen,
}: {
  workout: HistoryRow;
  exercises: readonly FinishedWorkoutExercise[];
  onOpen: () => void;
}) {
  const theme = useTheme();

  // An exercise that was added but never logged reads as nothing at all here.
  const logged = exercises.filter((exercise) => exercise.setCount > 0);
  const shown = logged.slice(0, MAX_LINES);
  const hidden = logged.length - shown.length;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onOpen();
      }}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <DateBadge epochMs={workout.startedAt} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {workout.name?.trim() || 'Workout'}
          </ThemedText>
          {workout.prCount > 0 && <PrChip label={String(workout.prCount)} />}
        </View>
        {shown.map((exercise, index) => (
          <ThemedText key={`${exercise.position}-${index}`} type="small" numberOfLines={1}>
            {exercise.setCount}x {exercise.name}
          </ThemedText>
        ))}
        {hidden > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            +{hidden} more
          </ThemedText>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.duration}>
        {formatHoursMinutes((workout.finishedAt ?? workout.startedAt) - workout.startedAt)}
      </ThemedText>
    </Pressable>
  );
}

function DateBadge({ epochMs }: { epochMs: number }) {
  const theme = useTheme();
  const date = new Date(epochMs);

  return (
    <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {date.toLocaleDateString(undefined, { weekday: 'short' })}
      </ThemedText>
      <ThemedText style={styles.day}>{date.getDate()}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  badge: {
    width: 54,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  day: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
    fontWeight: 700,
  },
  duration: {
    alignSelf: 'flex-start',
  },
});
