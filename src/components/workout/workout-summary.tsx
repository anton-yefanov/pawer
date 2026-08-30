import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SheetFooter } from '@/components/sheet-footer';
import { SHEET_FOOTER_HEIGHT } from '@/components/sheet-footer.types';
import { SheetGrabber } from '@/components/sheet-grabber';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { CONFETTI_DELAY_MS, WorkoutConfetti } from '@/components/workout/confetti';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
import { SHEET_SCROLL, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { attempt } from '@/lib/observability';
import { presentFirstWorkoutPaywall } from '@/lib/pro-gates';
import { usePro } from '@/lib/purchases';
import { useLiveRows } from '@/lib/use-live-rows';
import { useWeightUnit } from '@/lib/weight-unit';
import {
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { summarise } from '@/lib/workout-stats';

/**
 * The recap of a session that has just been finished. It is a sheet of its own,
 * raised over the tab root once the logger's sheet has gone — the finish is a
 * change of place, not a screen that swaps its contents underneath one sheet.
 */
export function WorkoutSummary({ id }: { id: string }) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const isPro = usePro();

  const workout = useLiveRows(() => workoutQuery(id), id)[0];
  const exercises = useLiveRows(() => workoutExercisesQuery(id), id);
  const sets = useLiveRows(() => workoutSetsQuery(id), id);
  const records = useLiveRows(() => workoutPersonalRecordsQuery(id), id);
  const earnedRecord = records.length > 0;

  // The buzz belongs to the sheet arriving, not to the Finish tap several
  // hundred milliseconds earlier, and it lands with the burst rather than
  // beside it.
  useEffect(() => {
    const timer = setTimeout(
      () => (earnedRecord ? haptics.reward() : haptics.complete()),
      CONFETTI_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [earnedRecord]);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  // The paywall is presented over the summary rather than after it: a modal
  // raised into a dismissing screen is a modal iOS drops on the floor.
  const done = async () => {
    await attempt('pro-gates', presentFirstWorkoutPaywall(isPro));
    router.dismissAll();
  };

  return (
    <View style={styles.container}>
      <SheetGrabber />

      <ScrollView {...SHEET_SCROLL} style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemedText type="title2" style={styles.title}>
          Nice work
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.title}>
          {workout.name?.trim() || 'Workout'}
        </ThemedText>

        <SummaryStats summary={summarise(workout, exercises, sets)} unit={unit} />

        <ExerciseBreakdown
          exercises={exercises}
          sets={sets}
          personalRecords={records}
          unit={unit}
        />
      </ScrollView>

      <SheetFooter>
        <BigButton title="Done" onPress={() => void done()} />
      </SheetFooter>

      <WorkoutConfetti />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingTop: SHEET_TOP_INSET + Spacing.four,
    gap: Spacing.three,
    paddingBottom: SHEET_FOOTER_HEIGHT + Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
});
