import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SheetHeader } from '@/components/sheet-header';
import {
  type ConfirmDestructive,
  type ConfirmRequest,
  folderActions,
  templateActions,
} from '@/components/templates/card-actions';
import { CardMenu } from '@/components/templates/card-menu';
import { ThemedText } from '@/components/themed-text';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { templates } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
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

  const [pending, setPending] = useState<ConfirmRequest | null>(null);

  const folder = folderRows?.[0];
  const list = rows ?? [];

  // Deleting the folder this sheet is showing takes the sheet with it; deleting
  // a template inside it only takes the row.
  const confirmFolderDelete: ConfirmDestructive = ({ onConfirm, ...options }) =>
    setPending({
      ...options,
      onConfirm: () => {
        onConfirm();
        router.back();
      },
    });

  const confirm: ConfirmDestructive = (options) => setPending(options);

  return (
    <>
      <SheetHeader
        title={folder?.name ?? ''}
        options={{ contentStyle: { backgroundColor: theme.surface } }}
        right={
          folder ? (
            <CardMenu
              accessibilityLabel={`${folder.name} options`}
              actions={folderActions(folder, { confirm: confirmFolderDelete })}
              size={HEADER_CIRCLE_SIZE}
            />
          ) : null
        }
      />

      <ScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.surface }}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic">
        {list.length === 0 && (
          <View style={styles.empty}>
            <Icon name="folder.fill" size={44} tintColor={theme.textSecondary} />
            <ThemedText type="footnote" themeColor="textSecondary" style={styles.emptyText}>
              Folder is empty. Drag a template onto this folder to add it
            </ThemedText>
          </View>
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
              <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
                {(byTemplate.get(template.id) ?? []).map((row) => row.name).join(', ')}
              </ThemedText>
            </Pressable>
            <CardMenu
              accessibilityLabel={`${template.name} options`}
              actions={templateActions(template, confirm)}
            />
          </View>
        ))}
      </ScrollView>

      <ConfirmAlert
        open={pending != null}
        title={pending?.title ?? ''}
        message={pending?.body ?? ''}
        confirmLabel="Delete"
        onConfirm={() => {
          pending?.onConfirm();
          setPending(null);
        }}
        onDismiss={() => setPending(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
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
});
