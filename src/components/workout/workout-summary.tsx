import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import { EarnedBadges } from '@/components/achievements/earned-badges';
import { SheetFooter } from '@/components/sheet-footer';
import { SHEET_FOOTER_HEIGHT } from '@/components/sheet-footer.types';
import { SheetGrabber } from '@/components/sheet-grabber';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { WorkoutMuscles } from '@/components/workout/workout-muscles';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
import { SHEET_SCROLL, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markEarned } from '@/lib/achievement-news';
import * as haptics from '@/lib/haptics';
import { attempt } from '@/lib/observability';
import { useEarnedBadges } from '@/lib/use-earned-badges';
import { useLiveRows } from '@/lib/use-live-rows';
import { useWeightUnit } from '@/lib/weight-unit';
import { useIncludeWarmup } from '@/lib/warmup-stats';
import {
  workoutExercisesQuery,
  workoutPersonalRecordsQuery,
  workoutQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { summarise } from '@/lib/workout-stats';

/** How long the recap takes to arrive, so the buzz lands with it rather than early. */
const ARRIVAL_MS = 200;

const CONTENT = {
  duration: 340,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/** The gap between one block settling and the next starting to move. */
const STAGGER_MS = 55;
const LIFT = 14;

/**
 * The recap assembles rather than appearing: the surface wipes up over the
 * session (see `WorkoutStage`), then each block lifts into place a beat after
 * the one above it. A single block arriving all at once is what read as flat.
 */
const settle = (index: number): EntryExitAnimationFunction =>
  () => {
    'worklet';
    const delay = index * STAGGER_MS;
    return {
      initialValues: { opacity: 0, transform: [{ translateY: LIFT }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, CONTENT)),
        transform: [{ translateY: withDelay(delay, withTiming(0, CONTENT)) }],
      },
    };
  };

/**
 * Done is `FloatingSurface`, so it cannot fade — an animated opacity flattens
 * its glass (see `WorkoutStage`). It rises from below the sheet's edge instead,
 * which hides it until its turn without touching opacity at all, and lands last
 * so the recap has finished assembling before there is anything to press.
 */
const DONE_DROP = 120;

const raiseDone: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { transform: [{ translateY: DONE_DROP }] },
    animations: {
      transform: [{ translateY: withDelay(6 * STAGGER_MS, withTiming(0, CONTENT)) }],
    },
  };
};

/**
 * The recap of a session that has just been finished. It shares the logger's
 * sheet rather than being raised as a second one: presenting a sheet over a
 * dismissing sheet is what stranded the stack, and no arrangement of the timing
 * between the two made it safe. See `WorkoutStage`.
 */
export function WorkoutSummary({ id, onDone }: { id: string; onDone: () => void }) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const includeWarmup = useIncludeWarmup();

  const workout = useLiveRows(() => workoutQuery(id), id)[0];
  const exercises = useLiveRows(() => workoutExercisesQuery(id), id);
  const sets = useLiveRows(() => workoutSetsQuery(id), id);
  const records = useLiveRows(() => workoutPersonalRecordsQuery(id), id);
  const earnedRecord = records.length > 0;

  const badges = useEarnedBadges(workout?.startedAt);

  // The recap is where a badge is announced, so it is also what marks it unread
  // — including for a past workout reopened and edited into a new milestone.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || badges.length === 0) return;
    marked.current = true;
    void attempt('settings', markEarned(badges.map((badge) => badge.key)));
  }, [badges]);

  // The buzz belongs to the recap arriving, not to the Finish tap a moment
  // earlier.
  useEffect(() => {
    const timer = setTimeout(
      () => (earnedRecord ? haptics.reward() : haptics.complete()),
      ARRIVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [earnedRecord]);

  if (!workout) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  return (
    <View style={styles.container}>
      {/* The logger drove the nav bar; the recap draws its own title in the
          content and wants the bar gone. Going through `SheetHeader` is what
          clears the running clock the logger left in `headerTitle`. */}
      <SheetHeader options={{ headerShown: false }} />
      <SheetGrabber />

      <ScrollView {...SHEET_SCROLL} style={styles.scroll} contentContainerStyle={styles.content}>
        <Animated.View entering={settle(0)}>
          <ThemedText type="title2" style={styles.title}>
            Nice work!
          </ThemedText>
        </Animated.View>

        <Animated.View entering={settle(1)}>
          <ThemedText themeColor="textSecondary" style={styles.title}>
            {badges.length > 0
              ? `You have earned ${badges.length} new achievement${badges.length === 1 ? '' : 's'}`
              : workout.name?.trim() || 'Workout'}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={settle(2)}>
          <EarnedBadges badges={badges} />
        </Animated.View>

        <Animated.View entering={settle(3)}>
          <WorkoutMuscles workoutId={id} />
        </Animated.View>

        <Animated.View entering={settle(4)}>
          <SummaryStats
            summary={summarise(workout, exercises, sets, includeWarmup)}
            unit={unit}
            tally
          />
        </Animated.View>

        <Animated.View entering={settle(5)}>
          <ExerciseBreakdown
            exercises={exercises}
            sets={sets}
            personalRecords={records}
            unit={unit}
          />
        </Animated.View>
      </ScrollView>

      <SheetFooter>
        <Animated.View entering={raiseDone}>
          <BigButton title="Done" onPress={onDone} />
        </Animated.View>
      </SheetFooter>
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
