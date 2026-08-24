import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/circle-button';
import { ExerciseAttributeTiles } from '@/components/exercise-attribute-tiles';
import { ThemedText } from '@/components/themed-text';
import { SheetHeader } from '@/components/sheet-header';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { BigButton } from '@/components/workout/big-button';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { deleteCustomExercise } from '@/lib/exercise-actions';
import { techniqueSearchUrl } from '@/lib/exercise-video-search';

const YOUTUBE_LOGO = require('@/assets/images/youtube_logo.png');

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

  const lookUpTechnique = () => {
    if (exercise) void Linking.openURL(techniqueSearchUrl(exercise.name));
  };

  return (
    <View style={styles.page}>
      <SheetHeader
        title={exercise?.name ?? ''}
        options={{ contentStyle: { backgroundColor: theme.surface } }}
        left={
          editable ? (
            <CircleButton
              symbol="trash"
              symbolSize={18}
              size={HEADER_CIRCLE_SIZE}
              label="Delete"
              onPress={() => setConfirming(true)}
            />
          ) : null
        }
        right={
          editable && editHref ? (
            <CircleButton
              symbol="pencil"
              symbolSize={18}
              size={HEADER_CIRCLE_SIZE}
              label="Edit"
              onPress={() => router.push(editHref)}
            />
          ) : null
        }
      />

      {/* The scroll view stays mounted while the query resolves: swapping it in
          a frame after the sheet has presented leaves iOS's automatic top inset
          applied, which shows up as a gap above the image on the first open. */}
      <ScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.surface }}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}>
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
            <View style={styles.tiles}>
              <ExerciseAttributeTiles exercise={exercise} />
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

            {editable ? null : (
              <BigButton
                title="Watch technique on YouTube"
                variant="soft"
                icon={
                  <Image source={YOUTUBE_LOGO} style={styles.youtubeLogo} resizeMode="contain" />
                }
                onPress={lookUpTechnique}
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  /* The icon masters carry ~11% transparent margin, so the row reads lower than
     it measures; this pulls it back up under the header. Only on iOS: Android's
     scroll view clips anything above its content origin, which cropped the top
     of every icon. */
  tiles: {
    marginTop: Platform.OS === 'ios' ? -Spacing.four : 0,
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
  youtubeLogo: {
    width: 26,
    height: 19,
  },
});
