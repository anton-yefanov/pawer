import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExerciseLibrary } from '@/components/exercise-library';
import { BigButton } from '@/components/workout/big-button';
import { SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { addDraftExercises } from '@/lib/template-draft';

const FOOTER_HEIGHT = 50 + Spacing.three * 2;

export default function AddTemplateExercisesScreen() {
  const [picked, setPicked] = useState<readonly string[]>([]);
  // Stable identity so the list's `extraData` only changes on a real toggle.
  const pickedSet = useMemo(() => new Set(picked), [picked]);

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id]
    );

  const confirm = () => {
    addDraftExercises(picked);
    router.back();
  };

  return (
    <>
      <ExerciseLibrary
        onSelect={(exercise) => toggle(exercise.id)}
        selectedIds={pickedSet}
        newExerciseHref="/new-exercise"
        detailHref={(exercise) => ({
          pathname: '/exercise/[id]',
          params: { id: exercise.id },
        })}
        topInset={SHEET_TOP_INSET}
        bottomInset={FOOTER_HEIGHT + Spacing.three}
      />

      {picked.length > 0 && (
        <View style={styles.footer}>
          <BigButton title={`Add ${picked.length}`} onPress={confirm} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
  },
});
