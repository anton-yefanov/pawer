import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SheetHeader } from '@/components/sheet-header';
import {
  type ConfirmDestructive,
  type ConfirmRequest,
  folderActions,
  templateActions,
} from '@/components/templates/card-actions';
import { CARD_MENU_SIZE, CardMenu } from '@/components/templates/card-menu';
import { TemplateDragProvider } from '@/components/templates/template-drag';
import { useShareButton } from '@/components/templates/share-button';
import { CardGrid, type Cell } from '@/components/templates/template-section';
import { useGridDrop } from '@/components/templates/use-grid-drop';
import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { HEADER_CIRCLE_SIZE } from '@/components/workout/workout-sheet-header';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { templates } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { usePro } from '@/lib/purchases';
import { toFolderCard, toTemplateCard } from '@/lib/template-cards';
import { folderQuery, foldersQuery, templateCardExercisesQuery } from '@/lib/template-queries';
import { groupBy } from '@/lib/workout-queries';

export default function FolderScreen() {
  const theme = useTheme();
  const isPro = usePro();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: folderRows } = useLiveQuery(folderQuery(id), [id]);
  const { data: allFolders } = useLiveQuery(foldersQuery(), []);
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
  const [dragging, setDragging] = useState(false);

  const folder = folderRows?.[0];
  const share = useShareButton(folder ? { kind: 'folder', id: folder.id } : null);
  // A Library folder is app-shipped: its cards are read-only, and the way one
  // leaves it is Save in the preview sheet, not a corner menu.
  const shipped = folder?.isBuiltIn ?? false;
  const subfolderRows = (allFolders ?? []).filter((row) => row.parentId === id);
  const templateRows = rows ?? [];
  const { folderCards, templateCards, onDrop, onReorder } = useGridDrop(
    subfolderRows.map((row) => toFolderCard(row, [])),
    templateRows.map((row) => toTemplateCard(row, byTemplate.get(row.id) ?? [])),
  );

  // Deleting the folder this sheet is showing takes the sheet with it; deleting
  // a card inside it only takes the card.
  const confirmFolderDelete: ConfirmDestructive = ({ onConfirm, ...options }) =>
    setPending({
      ...options,
      onConfirm: () => {
        onConfirm();
        router.back();
      },
    });

  const confirm: ConfirmDestructive = (options) => setPending(options);

  const menuFor = (cell: Cell) => {
    if (shipped) return null;
    const row =
      cell.kind === 'folder'
        ? subfolderRows.find((sub) => sub.id === cell.folder.id)
        : templateRows.find((template) => template.id === cell.template.id);
    if (!row) return null;
    return (
      <CardMenu
        accessibilityLabel={t('common:optionsFor', { name: row.name })}
        // `folderId` is the discriminator, not `isBuiltIn` — folders carry that
        // too now that the Library ships its own.
        actions={
          'folderId' in row
            ? templateActions(row, { confirm, isPro })
            : folderActions(row, { confirm })
        }
        size={CARD_MENU_SIZE}
      />
    );
  };

  return (
    <TemplateDragProvider onDrop={onDrop} onReorder={onReorder} onDraggingChange={setDragging}>
      <SheetHeader
        title={folder?.name ?? ''}
        // Dismissing mid-drag would unmount the lifted card under the finger.
        options={{ contentStyle: { backgroundColor: theme.background }, gestureEnabled: !dragging }}
        right={share.button}
        left={
          folder && !shipped ? (
            <CardMenu
              accessibilityLabel={t('common:optionsFor', { name: folder.name })}
              actions={folderActions(folder, { confirm: confirmFolderDelete, canAddFolder: true })}
              size={HEADER_CIRCLE_SIZE}
            />
          ) : null
        }
      />

      <ScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={!dragging}>
        {folderCards.length === 0 && templateCards.length === 0 ? (
          <EmptyState icon="folder.fill" text={t('templates:folder.empty')} />
        ) : (
          <CardGrid
            folders={folderCards}
            templates={templateCards}
            draggable={!shipped}
            menuFor={menuFor}
          />
        )}
      </ScrollView>
      {share.host}

      <ConfirmAlert
        open={pending != null}
        title={pending?.title ?? ''}
        message={pending?.body ?? ''}
        confirmLabel={t('common:action.delete')}
        onConfirm={() => {
          pending?.onConfirm();
          setPending(null);
        }}
        onDismiss={() => setPending(null)}
      />
    </TemplateDragProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
  },
});
