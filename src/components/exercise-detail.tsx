import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { exerciseFrames } from '@/lib/exercise-images';

export function ExerciseDetail({ id }: { id: string }) {
  const theme = useTheme();

  const { data } = useLiveQuery(
    db.select().from(exercises).where(eq(exercises.id, id)).limit(1),
    [id]
  );
  const exercise = data?.[0];

  if (!exercise) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <Stack.Screen options={{ title: '', contentStyle: { backgroundColor: theme.surface } }} />
      </View>
    );
  }

  const [frameOne] = exerciseFrames(exercise.sourceId);
  const facts = [
    ['Equipment', exercise.equipment],
    ['Primary', exercise.primaryMuscles.join(', ')],
    ['Secondary', exercise.secondaryMuscles.join(', ')],
    ['Level', exercise.level],
    ['Mechanic', exercise.mechanic],
    ['Force', exercise.force],
    ['Category', exercise.category],
  ].filter(([, value]) => value) as [string, string][];

  return (
    <ScrollView
      style={{ backgroundColor: theme.surface }}
      contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{ title: exercise.name, contentStyle: { backgroundColor: theme.surface } }}
      />

      <Image source={frameOne} style={styles.image} contentFit="contain" />

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 200,
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
