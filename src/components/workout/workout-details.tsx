import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SheetHeader } from '@/components/sheet-header';
import { SheetOverlay } from '@/components/sheet-overlay';
import { CardMenu } from '@/components/templates/card-menu';
import { type ConfirmDestructive, type ConfirmRequest } from '@/components/templates/card-actions';
import { EarnedBadges } from '@/components/achievements/earned-badges';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { WorkoutMuscles } from '@/components/workout/workout-muscles';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { workoutActions } from '@/components/workout/workout-menu-actions';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { usePro } from '@/lib/purchases';
import { useEarnedBadges } from '@/lib/use-earned-badges';
import { useWeightUnit } from '@/lib/weight-unit';
import { useIncludeWarmup } from '@/lib/warmup-stats';
import {
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { summarise } from '@/lib/workout-stats';

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
  const isPro = usePro();
  const unit = useWeightUnit();
  const includeWarmup = useIncludeWarmup();

  const workout = useLiveQuery(workoutQuery(id), [id]).data?.[0];
  const { data: exercises } = useLiveQuery(workoutExercisesQuery(id), [id]);
  const { data: sets } = useLiveQuery(workoutSetsQuery(id), [id]);
  const { data: records } = useLiveQuery(workoutPersonalRecordsQuery(id), [id]);
  // Read-only here: the recap is what marks a badge read.
  const badges = useEarnedBadges(workout?.startedAt);

  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  const confirm: ConfirmDestructive = (options) => setPending(options);

  const actions = workoutActions(workout, {
    isPro,
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
        title={workout.name?.trim() || t('workout:defaultName')}
        right={
          <CardMenu
            accessibilityLabel={t('workout:menu.workoutOptions')}
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
        <EarnedBadges badges={badges} />

        <WorkoutMuscles workoutId={id} />

        <SummaryStats
          summary={summarise(workout, exercises ?? [], sets ?? [], includeWarmup)}
          unit={unit}
          startedAt={workout.startedAt}
        />

        <ExerciseBreakdown
          exercises={exercises ?? []}
          sets={sets ?? []}
          personalRecords={records ?? []}
          unit={unit}
          showSets
        />
      </ScrollView>

      <SheetOverlay>
        <ConfirmAlert
          open={pending != null}
          title={pending?.title ?? ''}
          message={pending?.body ?? ''}
          confirmLabel={t('common:action.delete')}
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
      </SheetOverlay>
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
