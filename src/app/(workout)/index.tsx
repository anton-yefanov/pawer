import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { type FolderCardData } from '@/components/templates/folder-card';
import { type TemplateCardData } from '@/components/templates/template-card';
import {
  TemplateDragProvider,
  type DragKind,
  type Settle,
} from '@/components/templates/template-drag';
import { TemplateSection } from '@/components/templates/template-section';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { BigButton } from '@/components/workout/big-button';
import { ElapsedTime } from '@/components/workout/elapsed-time';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { type Template } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { asCardArtwork } from '@/lib/card-artwork';
import { moveTemplateToFolder, reorderFolders } from '@/lib/folder-actions';
import * as haptics from '@/lib/haptics';
import { move, sortBy } from '@/lib/order';
import { reorderTemplates } from '@/lib/template-actions';
import {
  foldersQuery,
  templateCardExercisesQuery,
  templatesQuery,
  type TemplateCardExercise,
} from '@/lib/template-queries';
import { startEmptyWorkout } from '@/lib/workout-actions';
import { activeWorkoutQuery, groupBy } from '@/lib/workout-queries';
import { formatStartTime } from '@/lib/workout-stats';

export default function StartWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data } = useLiveQuery(activeWorkoutQuery(), []);
  const active = data?.[0];

  const { data: mine } = useLiveQuery(templatesQuery(false), []);
  const { data: builtIn } = useLiveQuery(templatesQuery(true), []);
  const { data: folders } = useLiveQuery(foldersQuery(), []);
  const { data: templateExercises } = useLiveQuery(templateCardExercisesQuery(), []);

  // One join for the whole grid, sliced per template here rather than a query
  // per card.
  const byTemplate = useMemo(
    () => groupBy(templateExercises ?? [], (row) => row.templateId),
    [templateExercises],
  );

  const personal = mine ?? [];
  const loose = personal.filter((template) => template.folderId === null);
  const byFolder = groupBy(
    personal.filter((template) => template.folderId !== null),
    (template) => template.folderId,
  );

  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  /**
   * The order a drag just produced, applied on top of the live rows so the grid
   * re-renders with the card in its new slot on release rather than a DB
   * round-trip later — the delay is long enough to read as the card snapping
   * home and then jumping. It never needs clearing: once the write lands, the
   * live rows already match it and re-sorting is a no-op.
   */
  const [order, setOrder] = useState<{
    folders: string[];
    templates: string[];
  }>({
    folders: [],
    templates: [],
  });

  const folderCards = sortBy(
    (folders ?? []).map((folder): FolderCardData => ({
      id: folder.id,
      name: folder.name,
      color: folder.color,
      templateNames: (byFolder.get(folder.id) ?? []).map((template) => template.name),
    })),
    order.folders,
  );

  const myCards = sortBy(
    loose.map((t) => toCard(t, byTemplate.get(t.id) ?? [])),
    order.templates,
  );
  const builtInCards = (builtIn ?? []).map((t) => toCard(t, byTemplate.get(t.id) ?? []));

  const fileTemplate = (templateId: string, folderId: string, settle: Settle) => {
    settle();
    void moveTemplateToFolder(templateId, folderId);
  };

  /*
    `settle` runs in the same tick as `setOrder`, so the offsets clear and the
    grid re-renders together. Clearing earlier — on the UI thread as the finger
    lifts — leaves a frame where the cards are back in their old slots.

    Indices are grid-wide with folders first, so a template's index is offset by
    the folder count before it maps back into its own list.
  */
  const reorder = (kind: DragKind, from: number, to: number, settle: Settle) => {
    if (kind === 'folder') {
      const ids = move(
        folderCards.map((folder) => folder.id),
        from,
        to,
      );
      setOrder((current) => ({ ...current, folders: ids }));
      settle();
      void reorderFolders(ids);
    } else {
      const offset = folderCards.length;
      const ids = move(
        myCards.map((card) => card.id),
        from - offset,
        to - offset,
      );
      setOrder((current) => ({ ...current, templates: ids }));
      settle();
      void reorderTemplates(ids);
    }
  };

  const open = (id: string) => router.push({ pathname: '/active', params: { id } });

  const startEmpty = async () => {
    const result = await startEmptyWorkout();
    if (result.status === 'blocked') {
      setBlockedBy(result.workoutId);
      return;
    }
    haptics.press();
    open(result.workoutId);
  };

  return (
    <TemplateDragProvider onDrop={fileTemplate} onReorder={reorder} onDraggingChange={setDragging}>
      <View style={styles.screen}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.container}
          contentInsetAdjustmentBehavior="automatic"
          // A lifted card moves with the finger; letting the content scroll under
          // it at the same time would put it somewhere the drop test can't see.
          scrollEnabled={!dragging}>
          {active ? (
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardText}>
                  <ThemedText numberOfLines={1}>{active.name?.trim() || 'Workout'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Started {formatStartTime(active.startedAt)}
                  </ThemedText>
                </View>
                <ElapsedTime startedAt={active.startedAt} />
              </View>
              <BigButton title="Resume Workout" onPress={() => open(active.id)} />
            </View>
          ) : (
            <BigButton title="Start an Empty Workout" onPress={startEmpty} />
          )}

          <TemplateSection
            title="My Templates"
            templates={myCards}
            folders={folderCards}
            showAdd
            draggable
            emptyHint="Save a workout you repeat and it shows up here."
          />

          <TemplateSection title="Templates" templates={builtInCards} />
        </ScrollView>

        <ActiveWorkoutPrompt
          open={blockedBy != null}
          onResume={() => {
            const id = blockedBy;
            setBlockedBy(null);
            if (id) open(id);
          }}
          onDismiss={() => setBlockedBy(null)}
        />
      </View>
    </TemplateDragProvider>
  );
}

function toCard(template: Template, rows: readonly TemplateCardExercise[]): TemplateCardData {
  return {
    id: template.id,
    name: template.name,
    isBuiltIn: template.isBuiltIn,
    folderId: template.folderId,
    color: template.color,
    artwork: asCardArtwork(template.artwork),
    exerciseNames: rows.map((row) => row.name),
    exerciseArt: rows.map(({ sourceId, imageFile }) => ({ sourceId, imageFile })),
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: Spacing.half,
  },
});
