import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { BigButton } from '@/components/workout/big-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exerciseThumbnail } from '@/lib/exercise-images';
import { startWorkoutFromTemplate } from '@/lib/template-actions';
import { templateExercisesQuery, templateQuery } from '@/lib/template-queries';

export function TemplatePreview({ id }: { id: string }) {
  const theme = useTheme();
  const { data: templateRows } = useLiveQuery(templateQuery(id), [id]);
  const { data: exercises } = useLiveQuery(templateExercisesQuery(id), [id]);
  const template = templateRows?.[0];
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  // Pushed, not replaced: swapping one modal route for another makes
  // RNSScreenStack bail out (see workout/_layout.tsx).
  const open = (workoutId: string) =>
    router.push({ pathname: '/workout/active', params: { id: workoutId } });

  const start = async () => {
    const result = await startWorkoutFromTemplate(id);
    if (result.status === 'blocked') {
      setBlockedBy(result.workoutId);
      return;
    }
    open(result.workoutId);
  };

  return (
    <>
      <Stack.Screen options={{ title: template?.name ?? '' }} />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic">
        {exercises?.map((exercise) => (
          <Pressable
            key={exercise.id}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.background,
              },
            ]}
            onPress={() =>
              router.push({
                pathname: '/workout/exercise/[id]',
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
                {exercise.targetSets} × {exercise.name}
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

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <BigButton title="Start Workout" onPress={start} />
      </View>

      {blockedBy && (
        <ActiveWorkoutPrompt
          onResume={() => {
            setBlockedBy(null);
            open(blockedBy);
          }}
          onDismiss={() => setBlockedBy(null)}
        />
      )}
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
