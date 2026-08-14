import { inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { ExerciseReorderProvider, ReorderDim } from '@/components/workout/exercise-reorder';
import {
  CloseButton,
  headerItem,
  HeaderPillButton,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import type { LoggingActions } from '@/lib/logging-model';
import { DEFAULT_REST_SECONDS } from '@/lib/rest-timer';
import {
  addDraftSet,
  deleteDraftSet,
  moveDraftExercise,
  removeDraftExercise,
  resetDraft,
  setDraftExerciseNotes,
  setDraftExerciseRest,
  setDraftName,
  setDraftSetNotes,
  setDraftSetType,
  updateDraftSetValues,
  useTemplateDraft,
  type TemplateDraft,
} from '@/lib/template-draft';
import { useWeightUnit } from '@/lib/weight-unit';
import { groupBy, previousSetsQuery } from '@/lib/workout-queries';

/** Module scope keeps the identity stable without a hook. */
const DRAFT_ACTIONS: LoggingActions = {
  addSet: addDraftSet,
  removeExercise: removeDraftExercise,
  setExerciseNotes: setDraftExerciseNotes,
  setExerciseRest: setDraftExerciseRest,
  updateSetValues: updateDraftSetValues,
  setSetType: setDraftSetType,
  setSetNotes: setDraftSetNotes,
  deleteSet: deleteDraftSet,
};

/**
 * The same grid the logger uses, minus everything about doing the workout: no
 * checkbox, no rest countdown, no elapsed time. Shared by the New and Edit
 * routes — they differ only in what Save does.
 */
export function TemplateEditor({
  title,
  onSave,
}: {
  title: string;
  onSave: (draft: TemplateDraft) => Promise<void>;
}) {
  const theme = useTheme();
  const draft = useTemplateDraft();
  const unit = useWeightUnit();
  const [reordering, setReordering] = useState(false);

  // Which exercises are in the draft, not what order they are in: reordering
  // asks SQLite for the same rows back, and the refetch it costs lands a frame
  // after the drop.
  const exerciseIds = draft.exercises.map((row) => row.exerciseId);
  const membership = [...exerciseIds].sort().join(',');

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      // An empty `IN ()` is not valid SQLite, so an id that matches nothing stands in.
      .where(inArray(exercises.id, exerciseIds.length > 0 ? exerciseIds : [''])),
    [membership],
  );

  const { data: previous } = useLiveQuery(previousSetsQuery(null), []);
  const previousByExercise = groupBy(previous ?? [], (row) => row.exerciseId);

  const byId = new Map((data ?? []).map((row) => [row.id, row]));

  const name = draft.name.trim();

  const save = async () => {
    await onSave({ ...draft, name });
    resetDraft();
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title,
          contentStyle: { backgroundColor: theme.background },
          unstable_headerLeftItems: () =>
            headerItem(
              <HeaderSlot>
                <CloseButton onPress={() => router.back()} />
              </HeaderSlot>
            ),
          unstable_headerRightItems: () =>
            headerItem(
              <HeaderSlot>
                <HeaderPillButton title="Save" onPress={save} disabled={name === ''} />
              </HeaderSlot>
            ),
        }}
      />

      <ExerciseReorderProvider
        count={draft.exercises.length}
        onReorder={(from, to, settle) => {
          moveDraftExercise(from, to);
          settle();
          haptics.complete();
        }}
        onReorderingChange={setReordering}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.content}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // A lifted row moves with the finger; letting the content scroll under
          // it at the same time would put it somewhere the drop test can't see.
          scrollEnabled={!reordering}>
          <ReorderDim>
            <TextInput
              value={draft.name}
              onChangeText={setDraftName}
              placeholder="New Template"
              placeholderTextColor={theme.textSecondary}
              style={[styles.name, { color: theme.text }]}
              returnKeyType="done"
            />
          </ReorderDim>

          {draft.exercises.map((row, index) => {
            const exercise = byId.get(row.exerciseId);
            if (!exercise) return null;
            return (
              <ExerciseCard
                key={row.id}
                exercise={{
                  id: row.id,
                  exerciseId: row.exerciseId,
                  name: exercise.name,
                  trackingType: exercise.trackingType,
                  notes: row.notes,
                  restSeconds: row.restSeconds,
                }}
                index={index}
                sets={row.sets.map((set) => ({ ...set, completed: false }))}
                previous={previousByExercise.get(row.exerciseId) ?? []}
                unit={unit}
                defaultRestSeconds={DEFAULT_REST_SECONDS}
                actions={DRAFT_ACTIONS}
                onOpenExercise={(exerciseId) =>
                  router.push({
                    pathname: '/exercise/[id]',
                    params: { id: exerciseId },
                  })
                }
              />
            );
          })}

          <ReorderDim>
            <BigButton
              title="Add Exercises"
              variant="tinted"
              symbol="plus"
              onPress={() => router.push('/template/add-exercises')}
            />
          </ReorderDim>

          {draft.exercises.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Add an exercise to plan its sets.
            </ThemedText>
          )}
        </ScrollView>
      </ExerciseReorderProvider>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: 240,
    gap: Spacing.three,
  },
  name: {
    fontSize: 32,
    // No lineHeight: iOS centres the glyph box inside it and clips descenders.
    paddingVertical: 5,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
  },
});
