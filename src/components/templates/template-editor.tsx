import { inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  DraggableExerciseRow,
  ExerciseRowReorderProvider,
  ROW_HEIGHT,
} from '@/components/templates/exercise-row-drag';
import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
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
import { exerciseThumbnail } from '@/lib/exercise-images';
import {
  moveDraftExercise,
  removeDraftExercise,
  resetDraft,
  setDraftName,
  useTemplateDraft,
  type TemplateDraft,
} from '@/lib/template-draft';

/** Shared by the New and Edit routes — they differ only in what Save does. */
export function TemplateEditor({
  title,
  onSave,
}: {
  title: string;
  onSave: (draft: TemplateDraft) => Promise<void>;
}) {
  const theme = useTheme();
  const draft = useTemplateDraft();
  const [reordering, setReordering] = useState(false);

  // Which exercises are in the draft, not what order they are in: reordering
  // asks SQLite for the same rows back, and the refetch it costs lands a frame
  // after the drop.
  const membership = [...draft.exerciseIds].sort().join(',');

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      // An empty `IN ()` is not valid SQLite, so an id that matches nothing stands in.
      .where(inArray(exercises.id, draft.exerciseIds.length > 0 ? [...draft.exerciseIds] : [''])),
    [membership],
  );

  // The query returns rows in whatever order SQLite picks; the draft is ordered.
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  const picked = draft.exerciseIds.map((id) => byId.get(id)).filter((row) => row !== undefined);
  const pickedIds = picked.map((exercise) => exercise.id);

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
          contentStyle: { backgroundColor: theme.surface },
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

      <ExerciseRowReorderProvider
        ids={pickedIds}
        onReorder={moveDraftExercise}
        onReorderingChange={setReordering}>
        <ScrollView
          style={{ backgroundColor: theme.surface }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // A lifted row moves with the finger; letting the content scroll under
          // it at the same time would put it somewhere the drop test can't see.
          scrollEnabled={!reordering}>
          <TextInput
            value={draft.name}
            onChangeText={setDraftName}
            placeholder="New Template"
            placeholderTextColor={theme.textSecondary}
            style={[styles.name, { color: theme.text }]}
            returnKeyType="done"
          />

          {picked.map((exercise, index) => (
            <DraggableExerciseRow key={exercise.id} id={exercise.id} index={index}>
              <View style={styles.row}>
                <Image
                  source={exerciseThumbnail(exercise.sourceId)}
                  style={styles.thumb}
                  contentFit="contain"
                />
                <ThemedText style={styles.rowName} numberOfLines={1}>
                  {exercise.name}
                </ThemedText>
                <Pressable
                  onPress={() => removeDraftExercise(exercise.id)}
                  accessibilityLabel={`Remove ${exercise.name}`}
                  hitSlop={Spacing.two}>
                  <SymbolView name="minus.circle.fill" size={22} tintColor={theme.danger} />
                </Pressable>
              </View>
            </DraggableExerciseRow>
          ))}

          <BigButton
            title="Add Exercises"
            variant="tinted"
            symbol="plus"
            onPress={() => router.push('/template/add-exercises')}
          />
        </ScrollView>
      </ExerciseRowReorderProvider>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  name: {
    fontSize: 32,
    // No lineHeight: iOS centres the glyph box inside it and clips descenders.
    paddingVertical: 5,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    // Fixed, because the drag maps an index to a slot by arithmetic on it.
    height: ROW_HEIGHT,
  },
  thumb: {
    width: ROW_HEIGHT,
    height: ROW_HEIGHT,
  },
  rowName: {
    flex: 1,
  },
});
