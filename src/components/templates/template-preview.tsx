import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  type ConfirmDestructive,
  type ConfirmRequest,
  templateActions,
} from '@/components/templates/card-actions';
import { ExerciseThumb } from '@/components/exercise-thumb';
import { CardMenu } from '@/components/templates/card-menu';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { BigButton } from '@/components/workout/big-button';
import { SheetFooter } from '@/components/sheet-footer';
import { SHEET_FOOTER_HEIGHT } from '@/components/sheet-footer.types';
import { SheetHeader } from '@/components/sheet-header';
import { SheetOverlay } from '@/components/sheet-overlay';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { startWorkoutFromTemplate } from '@/lib/template-actions';
import { templateExercisesQuery, templateQuery } from '@/lib/template-queries';
import { useLiveRows } from '@/lib/use-live-rows';
import { guard } from '@/lib/observability';

export function TemplatePreview({ id }: { id: string }) {
  const theme = useTheme();
  const templateRows = useLiveRows(() => templateQuery(id), id);
  const exercises = useLiveRows(() => templateExercisesQuery(id), id);
  const template = templateRows[0];
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);

  const confirm: ConfirmDestructive = (options) => setPending(options);

  // Pushed, not replaced: swapping one modal route for another makes
  // RNSScreenStack bail out (see workout/_layout.tsx).
  const open = (workoutId: string) =>
    router.push({ pathname: '/active', params: { id: workoutId } });

  const start = async () => {
    const result = await guard('workout', startWorkoutFromTemplate(id), {
      title: 'Couldn’t start workout',
      message: 'Please try again.',
    });
    if (!result) return;
    if (result.status === 'blocked') {
      setBlockedBy(result.workoutId);
      return;
    }
    haptics.press();
    open(result.workoutId);
  };

  return (
    <>
      <SheetHeader
        title={template?.name ?? ''}
        options={{ contentStyle: { backgroundColor: theme.surface } }}
        right={
          template ? (
            <CardMenu
              accessibilityLabel={`${template.name} options`}
              actions={templateActions(template, confirm)}
              size={HEADER_CIRCLE_SIZE}
            />
          ) : null
        }
      />

      <ScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.surface }}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic">
        {exercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.surface,
              },
            ]}
            onPress={() =>
              router.push({
                pathname: '/exercise/[id]',
                params: { id: exercise.exerciseId },
              })
            }>
            <ExerciseThumb art={exercise} />
            <View style={styles.rowText}>
              <ThemedText numberOfLines={1}>
                {Math.max(1, exercise.setCount)} × {exercise.name}
              </ThemedText>
              {exercise.primaryMuscles[0] && (
                <ThemedText type="footnote" themeColor="textSecondary" style={styles.muscle}>
                  {exercise.primaryMuscles[0]}
                </ThemedText>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <SheetOverlay>
        <SheetFooter>
          <BigButton title="Start Workout" onPress={() => void start()} />
        </SheetFooter>

        {/* Deleting the template this sheet is showing takes the sheet with it. */}
        <ConfirmAlert
          open={pending != null}
          title={pending?.title ?? ''}
          message={pending?.body ?? ''}
          confirmLabel="Delete"
          onConfirm={() => {
            pending?.onConfirm();
            setPending(null);
            router.back();
          }}
          onDismiss={() => setPending(null)}
        />

        <ActiveWorkoutPrompt
          open={blockedBy != null}
          onResume={() => {
            const id = blockedBy;
            setBlockedBy(null);
            if (id) open(id);
          }}
          onDismiss={() => setBlockedBy(null)}
        />
      </SheetOverlay>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.two,
    paddingBottom: SHEET_FOOTER_HEIGHT + Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  muscle: {
    textTransform: 'capitalize',
  },
});
