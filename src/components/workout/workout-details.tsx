import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SheetHeader } from '@/components/sheet-header';
import { CardMenu } from '@/components/templates/card-menu';
import { type ConfirmDestructive, type ConfirmRequest } from '@/components/templates/card-actions';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { workoutActions } from '@/components/workout/workout-menu-actions';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWeightUnit } from '@/lib/weight-unit';
import {
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { formatStartTime, summarise } from '@/lib/workout-stats';

export function WorkoutDetails({
  id,
  onEdit,
  onOpenWorkout,
  onDeleted,
}: {
  id: string;
  onEdit: () => void;
  onOpenWorkout: (workoutId: string) => void;
  onDeleted: () => void;
}) {
  const theme = useTheme();
  const unit = useWeightUnit();

  const workout = useLiveQuery(workoutQuery(id), [id]).data?.[0];
  const { data: exercises } = useLiveQuery(workoutExercisesQuery(id), [id]);
  const { data: sets } = useLiveQuery(workoutSetsQuery(id), [id]);
  const { data: records } = useLiveQuery(workoutPersonalRecordsQuery(id), [id]);

  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  const confirm: ConfirmDestructive = (options) => setPending(options);

  const actions = workoutActions(workout, {
    onEdit,
    onRepeat: (result) => {
      if (result.status === 'blocked') setBlockedBy(result.workoutId);
      else onOpenWorkout(result.workoutId);
    },
    onDeleted,
    confirm,
  });

  return (
    <>
      <SheetHeader
        title={workout.name?.trim() || 'Workout'}
        right={
          <CardMenu
            accessibilityLabel="Workout options"
            actions={actions}
            size={HEADER_CIRCLE_SIZE}
          />
        }
      />

      <ScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <ThemedText type="footnote" themeColor="textSecondary">
          {formatStartTime(workout.startedAt)}
        </ThemedText>

        <SummaryStats summary={summarise(workout, exercises ?? [], sets ?? [])} unit={unit} />

        <ExerciseBreakdown
          exercises={exercises ?? []}
          sets={sets ?? []}
          personalRecords={records ?? []}
          unit={unit}
          showSets
        />
      </ScrollView>

      <ConfirmAlert
        open={pending != null}
        title={pending?.title ?? ''}
        message={pending?.body ?? ''}
        confirmLabel="Delete"
        onConfirm={() => {
          pending?.onConfirm();
          setPending(null);
        }}
        onDismiss={() => setPending(null)}
      />

      <ActiveWorkoutPrompt
        open={blockedBy != null}
        onResume={() => {
          const id = blockedBy;
          setBlockedBy(null);
          if (id) onOpenWorkout(id);
        }}
        onDismiss={() => setBlockedBy(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
