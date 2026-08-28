import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/circle-button';
import { ExerciseVideo } from '@/components/exercise-video';
import { ExerciseInsights } from '@/components/exercises/exercise-insights';
import { SheetGrabber } from '@/components/sheet-grabber';
import { ThemedText } from '@/components/themed-text';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { deleteCustomExercise } from '@/lib/exercise-actions';
import { techniqueSearchUrl } from '@/lib/exercise-video-search';

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
      <SheetGrabber />

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
            {editable ? (
              <View style={styles.actions}>
                <CircleButton
                  symbol="trash"
                  symbolSize={18}
                  size={HEADER_CIRCLE_SIZE}
                  label="Delete"
                  onPress={() => setConfirming(true)}
                />
                {editHref ? (
                  <CircleButton
                    symbol="pencil"
                    symbolSize={18}
                    size={HEADER_CIRCLE_SIZE}
                    label="Edit"
                    onPress={() => router.push(editHref)}
                  />
                ) : null}
              </View>
            ) : null}

            <ExerciseVideo art={exercise} />

            <ThemedText style={styles.name}>{exercise.name}</ThemedText>

            <ExerciseInsights
              id={id}
              trackingType={exercise.trackingType}
              onOpenTechnique={editable ? undefined : lookUpTechnique}
            />
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
    /* No padding of its own: a grabber-bearing sheet already insets its content
       by about `Spacing.three`, which is what puts the clip the same distance
       from the top as from the sides. */
    paddingTop: 0,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
  },
});
