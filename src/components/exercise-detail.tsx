import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/circle-button';
import { ThemedText } from '@/components/themed-text';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import {
  HEADER_CIRCLE_SIZE,
  headerItem,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { deleteCustomExercise } from '@/lib/exercise-actions';
import { exerciseFrames } from '@/lib/exercise-images';

export function ExerciseDetail({ id, editHref }: { id: string; editHref?: Href }) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);

  const { data } = useLiveQuery(db.select().from(exercises).where(eq(exercises.id, id)).limit(1), [
    id,
  ]);
  const exercise = data?.[0];
  const editable = exercise?.isCustom === true;

  const remove = async () => {
    await deleteCustomExercise(id);
    router.back();
  };

  const facts = exercise
    ? ([
        ['Equipment', exercise.equipment],
        ['Primary', exercise.primaryMuscles.join(', ')],
        ['Secondary', exercise.secondaryMuscles.join(', ')],
        ['Level', exercise.level],
        ['Mechanic', exercise.mechanic],
        ['Force', exercise.force],
        ['Category', exercise.category],
      ].filter(([, value]) => value) as [string, string][])
    : [];

  return (
    /* The scroll view stays mounted while the query resolves: swapping it in a
       frame after the sheet has presented leaves iOS's automatic top inset
       applied, which shows up as a gap above the image on the first open. */
    <ScrollView
      style={{ backgroundColor: theme.surface }}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}>
      <Stack.Screen
        options={{
          title: exercise?.name ?? '',
          contentStyle: { backgroundColor: theme.surface },
          unstable_headerLeftItems: () =>
            editable
              ? headerItem(
                  <HeaderSlot>
                    <CircleButton
                      symbol="trash"
                      symbolSize={18}
                      size={HEADER_CIRCLE_SIZE}
                      label="Delete"
                      onPress={() => setConfirming(true)}
                    />
                  </HeaderSlot>,
                )
              : [],
          unstable_headerRightItems: () =>
            editable && editHref
              ? headerItem(
                  <HeaderSlot>
                    <CircleButton
                      symbol="pencil"
                      symbolSize={18}
                      size={HEADER_CIRCLE_SIZE}
                      label="Edit"
                      onPress={() => router.push(editHref)}
                    />
                  </HeaderSlot>,
                )
              : [],
        }}
      />

      <ConfirmAlert
        open={confirming}
        title={`Delete "${exercise?.name ?? ''}"?`}
        message="It will be removed from your exercise list and templates. Past workouts keep their sets."
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirming(false);
          void remove();
        }}
        onDismiss={() => setConfirming(false)}
      />

      {exercise ? (
        <>
          <View style={styles.frames}>
            {exerciseFrames(exercise.sourceId).map((frame, i) => (
              <Image key={i} source={frame} style={styles.image} contentFit="contain" />
            ))}
          </View>

          <View style={styles.facts}>
            {facts.map(([label, value]) => (
              <View key={label} style={styles.factRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.factLabel}>
                  {label}
                </ThemedText>
                <ThemedText type="small" style={styles.factValue}>
                  {value}
                </ThemedText>
              </View>
            ))}
          </View>

          {exercise.description ? (
            <ThemedText type="small">{exercise.description}</ThemedText>
          ) : null}

          {exercise.instructions.map((step, i) => (
            <View key={i} style={styles.step}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.stepNumber}>
                {i + 1}
              </ThemedText>
              <ThemedText type="small" style={styles.stepText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  frames: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  image: {
    flex: 1,
    aspectRatio: 1,
  },
  facts: {
    gap: Spacing.one,
  },
  factRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  factLabel: {
    width: 90,
  },
  factValue: {
    flex: 1,
    textTransform: 'capitalize',
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepNumber: {
    width: 16,
  },
  stepText: {
    flex: 1,
  },
});
