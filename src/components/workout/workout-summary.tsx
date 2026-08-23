import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SheetFooter } from '@/components/sheet-footer';
import { SHEET_FOOTER_HEIGHT } from '@/components/sheet-footer.types';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { mascotImage } from '@/lib/mascot-images';
import { type WeightUnit } from '@/lib/units';
import {
  type WorkoutExerciseRow,
  type WorkoutPrRow,
  type WorkoutSetRow,
} from '@/lib/workout-queries';
import { type WorkoutSummary as Summary } from '@/lib/workout-stats';

export function WorkoutSummary({
  name,
  summary,
  exercises,
  sets,
  personalRecords,
  unit,
  onDone,
}: {
  name: string;
  summary: Summary;
  exercises: readonly WorkoutExerciseRow[];
  sets: readonly WorkoutSetRow[];
  personalRecords: readonly WorkoutPrRow[];
  unit: WeightUnit;
  onDone: () => void;
}) {
  return (
    <View style={styles.container}>
      <ScrollView {...SHEET_SCROLL} style={styles.scroll} contentContainerStyle={styles.content}>
        <Image source={mascotImage('celebrating')} style={styles.mascot} contentFit="contain" />
        <ThemedText type="subtitle" style={styles.title}>
          Nice work
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.title}>
          {name}
        </ThemedText>

        <SummaryStats summary={summary} unit={unit} />

        <ExerciseBreakdown
          exercises={exercises}
          sets={sets}
          personalRecords={personalRecords}
          unit={unit}
        />
      </ScrollView>

      <SheetFooter>
        <BigButton title="Done" onPress={onDone} />
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
    gap: Spacing.three,
    paddingBottom: SHEET_FOOTER_HEIGHT + Spacing.three,
  },
  mascot: {
    width: 180,
    height: 180,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
  },
});
