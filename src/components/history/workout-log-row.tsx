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
          <ThemedText type="headline" style={styles.name} numberOfLines={1}>
            {workout.name?.trim() || 'Workout'}
          </ThemedText>
          {workout.prCount > 0 && <PrChip label={String(workout.prCount)} />}
        </View>
        {shown.map((exercise, index) => (
          <ThemedText key={`${exercise.position}-${index}`} type="footnote" numberOfLines={1}>
            {exercise.setCount}x {exercise.name}
          </ThemedText>
        ))}
        {hidden > 0 && (
          <ThemedText type="footnote" themeColor="textSecondary">
            +{hidden} more
          </ThemedText>
        )}
      </View>

      <ThemedText type="footnote" numeric themeColor="textTertiary" style={styles.duration}>
        {formatHoursMinutes((workout.finishedAt ?? workout.startedAt) - workout.startedAt)}
      </ThemedText>
    </Pressable>
  );
}

function DateBadge({ epochMs }: { epochMs: number }) {
  const theme = useTheme();
  const date = new Date(epochMs);

  return (
    <View style={styles.badge}>
      <View
        style={[
          styles.weekday,
          {
            // Both stops are opaque so nothing interpolates through transparent
            // black, which is what fringes a fade to `transparent`.
            experimental_backgroundImage: `radial-gradient(115% 150% at 50% 15%, ${theme.backgroundElement} 0%, ${theme.backgroundSelected} 100%)`,
          },
        ]}>
        <ThemedText type="caption1" weight="medium" themeColor="textTertiary">
          {date.toLocaleDateString(undefined, { weekday: 'short' })}
        </ThemedText>
      </View>
      <View style={[styles.day, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="title2" numeric>
          {date.getDate()}
        </ThemedText>
      </View>
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
  // A calendar tile: the weekday sits in a darker header cut off by a hard edge,
  // lit from its own centre so the band reads as a curved surface rather than a
  // flat swatch. The date below is what stays plain.
  badge: {
    width: 54,
    borderRadius: 10,
    overflow: 'hidden',
  },
  weekday: {
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  day: {
    alignItems: 'center',
    paddingTop: Spacing.half,
    paddingBottom: Spacing.one,
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
  },
  duration: {
    alignSelf: 'flex-start',
  },
});
