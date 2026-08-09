import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { templateActions } from '@/components/templates/card-actions';
import { CardMenu } from '@/components/templates/card-menu';
import { ThemedText } from '@/components/themed-text';
import { Dialog, DialogButton } from '@/components/workout/dialog';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { templates } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { folderQuery, templateCardExercisesQuery } from '@/lib/template-queries';
import { groupBy } from '@/lib/workout-queries';

type Pending = { title: string; body: string; onConfirm: () => void };

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

  // Alert can't present from inside a formSheet, so the confirmation is a view.
  const [pending, setPending] = useState<Pending | null>(null);

  const folder = folderRows?.[0];
  const list = rows ?? [];

  return (
    <>
      <Stack.Screen options={{ title: folder?.name ?? '' }} />

      <ScrollView
        style={{ backgroundColor: theme.background }}
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
              onPress={() =>
                router.push({ pathname: '/workout/template/[id]', params: { id: template.id } })
              }>
              <ThemedText numberOfLines={1}>{template.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {(byTemplate.get(template.id) ?? []).map((row) => row.name).join(', ')}
              </ThemedText>
            </Pressable>
            <CardMenu
              accessibilityLabel={`${template.name} options`}
              actions={templateActions(template, setPending)}
            />
          </View>
        ))}
      </ScrollView>

      {pending && (
        <Dialog
          emoji="🗑️"
          title={pending.title}
          body={pending.body}
          onDismiss={() => setPending(null)}>
          <DialogButton
            label="Delete"
            background={theme.danger}
            color={theme.accentContent}
            onPress={() => {
              pending.onConfirm();
              setPending(null);
            }}
          />
          <DialogButton
            label="Cancel"
            background={theme.backgroundElement}
            color={theme.text}
            onPress={() => setPending(null)}
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
});
