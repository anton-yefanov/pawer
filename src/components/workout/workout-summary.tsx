import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { ExerciseBreakdown, SummaryStats } from '@/components/workout/workout-recap';
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
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={mascotImage('celebrating')} style={styles.mascot} contentFit="cover" />
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

      <View style={styles.footer}>
        <BigButton title="Done" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  mascot: {
    // The master is a square canvas letterboxing 4:3 art, so cover into a 4:3
    // box crops exactly the transparent bars.
    aspectRatio: 4 / 3,
    marginTop: -Spacing.three,
    marginHorizontal: -Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.three,
  },
});
