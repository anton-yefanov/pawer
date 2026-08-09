import { inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import {
  CloseButton,
  HeaderPillButton,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { exerciseThumbnail } from '@/lib/exercise-images';
import {
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

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      // An empty `IN ()` is not valid SQLite, so an id that matches nothing stands in.
      .where(inArray(exercises.id, draft.exerciseIds.length > 0 ? [...draft.exerciseIds] : [''])),
    [draft.exerciseIds],
  );

  // The query returns rows in whatever order SQLite picks; the draft is ordered.
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  const picked = draft.exerciseIds.map((id) => byId.get(id)).filter((row) => row !== undefined);

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
          headerLeft: () => (
            <HeaderSlot>
              <CloseButton onPress={() => router.back()} />
            </HeaderSlot>
          ),
          headerRight: () => (
            <HeaderSlot>
              <HeaderPillButton title="Save" onPress={save} disabled={name === ''} />
            </HeaderSlot>
          ),
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <TextInput
          value={draft.name}
          onChangeText={setDraftName}
          placeholder="New Template"
          placeholderTextColor={theme.textSecondary}
          style={[styles.name, { color: theme.text }]}
          returnKeyType="done"
        />

        {picked.map((exercise) => (
          <View key={exercise.id} style={styles.row}>
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
        ))}

        <BigButton
          title="Add Exercises"
          variant="tinted"
          symbol="plus"
          onPress={() => router.push('/workout/template/add-exercises')}
        />
      </ScrollView>
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
    lineHeight: 44,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  thumb: {
    width: 48,
    height: 48,
  },
  rowName: {
    flex: 1,
  },
});
