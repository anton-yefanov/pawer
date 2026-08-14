import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  type ConfirmDestructive,
  templateActions,
} from '@/components/templates/card-actions';
import { CardMenu } from '@/components/templates/card-menu';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { BigButton } from '@/components/workout/big-button';
import {
  HEADER_CIRCLE_SIZE,
  headerItem,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exerciseThumbnail } from '@/lib/exercise-images';
import * as haptics from '@/lib/haptics';
import { startWorkoutFromTemplate } from '@/lib/template-actions';
import { templateExercisesQuery, templateQuery } from '@/lib/template-queries';

export function TemplatePreview({ id }: { id: string }) {
  const theme = useTheme();
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: exercises } = useLiveQuery(templateExercisesQuery(id), [id]);
  const template = templateRows?.[0];
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  const confirm: ConfirmDestructive = ({ title, body, onConfirm }) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onConfirm();
          router.back();
        },
      },
    ]);

  // Pushed, not replaced: swapping one modal route for another makes
  // RNSScreenStack bail out (see workout/_layout.tsx).
  const open = (workoutId: string) =>
    router.push({ pathname: '/active', params: { id: workoutId } });

  const start = async () => {
    const result = await startWorkoutFromTemplate(id);
    if (result.status === 'blocked') {
      setBlockedBy(result.workoutId);
      return;
    }
    haptics.press();
    open(result.workoutId);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: template?.name ?? '',
          contentStyle: { backgroundColor: theme.surface },
          unstable_headerRightItems: () =>
            template
              ? headerItem(
                  <HeaderSlot>
                    <CardMenu
                      accessibilityLabel={`${template.name} options`}
                      actions={templateActions(template, confirm)}
                      size={HEADER_CIRCLE_SIZE}
                    />
                  </HeaderSlot>
                )
              : [],
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.surface }}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic">
        {exercises?.map((exercise) => (
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
            <Image
              source={exerciseThumbnail(exercise.sourceId)}
              style={styles.thumb}
              contentFit="contain"
            />
            <View style={styles.rowText}>
              <ThemedText numberOfLines={1}>
                {Math.max(1, exercise.setCount)} × {exercise.name}
              </ThemedText>
              {exercise.primaryMuscles[0] && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.muscle}>
                  {exercise.primaryMuscles[0]}
                </ThemedText>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <BigButton title="Start Workout" onPress={start} />
      </View>

      <ActiveWorkoutPrompt
        open={blockedBy != null}
        onResume={() => {
          const id = blockedBy;
          setBlockedBy(null);
          if (id) open(id);
        }}
        onDismiss={() => setBlockedBy(null)}
      />
    </>
  );
}

const FOOTER_HEIGHT = 50 + Spacing.three * 2;

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.two,
    paddingBottom: FOOTER_HEIGHT + Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  thumb: {
    width: 48,
    height: 48,
  },
  rowText: {
    flex: 1,
  },
  muscle: {
    textTransform: 'capitalize',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
  },
});
