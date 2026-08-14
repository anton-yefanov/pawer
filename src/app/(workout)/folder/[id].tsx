import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  alertConfirm,
  type ConfirmDestructive,
  folderActions,
  templateActions,
} from '@/components/templates/card-actions';
import { CardMenu } from '@/components/templates/card-menu';
import { ThemedText } from '@/components/themed-text';
import { Dialog, DialogButton } from '@/components/workout/dialog';
import {
  HEADER_CIRCLE_SIZE,
  headerItem,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { templates } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { renameFolder } from '@/lib/folder-actions';
import * as haptics from '@/lib/haptics';
import { folderQuery, templateCardExercisesQuery } from '@/lib/template-queries';
import { groupBy } from '@/lib/workout-queries';

export default function FolderScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: folderRows } = useLiveQuery(folderQuery(id), [id]);
  const { data: rows } = useLiveQuery(
    db
      .select()
      .from(templates)
      .where(and(eq(templates.folderId, id), isNull(templates.deletedAt)))
      .orderBy(asc(templates.position)),
    [id]
  );
  const { data: templateExercises } = useLiveQuery(templateCardExercisesQuery(), []);

  const byTemplate = useMemo(
    () => groupBy(templateExercises ?? [], (row) => row.templateId),
    [templateExercises]
  );

  const [renaming, setRenaming] = useState<string | null>(null);

  const folder = folderRows?.[0];
  const list = rows ?? [];

  // Deleting the folder this sheet is showing takes the sheet with it.
  const confirmFolderDelete: ConfirmDestructive = ({ onConfirm, ...options }) =>
    alertConfirm({
      ...options,
      onConfirm: () => {
        onConfirm();
        router.back();
      },
    });

  return (
    <>
      <Stack.Screen
        options={{
          title: folder?.name ?? '',
          contentStyle: { backgroundColor: theme.surface },
          unstable_headerRightItems: () =>
            folder
              ? headerItem(
                  <HeaderSlot>
                    <CardMenu
                      accessibilityLabel={`${folder.name} options`}
                      actions={folderActions(folder, {
                        onRename: () => setRenaming(folder.name),
                        confirm: confirmFolderDelete,
                      })}
                      size={HEADER_CIRCLE_SIZE}
                    />
                  </HeaderSlot>
                )
              : [],
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.surface }}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic">
        {list.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Empty. Drag a template onto this folder to file it here.
          </ThemedText>
        )}

        {list.map((template) => (
          <View key={template.id} style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.rowText, pressed && styles.pressed]}
              onPress={() => {
                haptics.tap();
                router.push({
                  pathname: '/template/[id]',
                  params: { id: template.id },
                });
              }}>
              <ThemedText numberOfLines={1}>{template.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {(byTemplate.get(template.id) ?? []).map((row) => row.name).join(', ')}
              </ThemedText>
            </Pressable>
            <CardMenu
              accessibilityLabel={`${template.name} options`}
              actions={templateActions(template)}
            />
          </View>
        ))}
      </ScrollView>

      {renaming !== null && (
        <Dialog emoji="📁" title="Rename Folder" feedback="tap" onDismiss={() => setRenaming(null)}>
          <TextInput
            value={renaming}
            onChangeText={setRenaming}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          <DialogButton
            label="Rename"
            background={theme.accent}
            color={theme.accentContent}
            onPress={() => {
              const name = renaming.trim();
              if (name) void renameFolder(id, name);
              setRenaming(null);
            }}
          />
          <DialogButton
            label="Cancel"
            background={theme.backgroundElement}
            color={theme.text}
            onPress={() => setRenaming(null)}
          />
        </Dialog>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.two,
  },
  empty: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
  },
});
