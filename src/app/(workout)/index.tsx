import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AchievementsButton } from '@/components/achievements/achievements-button';
import { BlockView } from '@/components/analytics/block-view';
import { TemplateDragProvider } from '@/components/templates/template-drag';
import { TemplateSection } from '@/components/templates/template-section';
import { useGridDrop } from '@/components/templates/use-grid-drop';
import { TabTitle, TAB_TITLE_INSET } from '@/components/tab-title';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { BigButton } from '@/components/workout/big-button';
import { ElapsedTime } from '@/components/workout/elapsed-time';
import { ExerciseReorderProvider } from '@/components/workout/exercise-reorder';
import { BottomTabInset, CardRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import * as haptics from '@/lib/haptics';
import { useHomeWidget } from '@/lib/home-widget';
import { guard } from '@/lib/observability';
import { toFolderCard, toTemplateCard } from '@/lib/template-cards';
import {
  foldersQuery,
  templateCardExercisesQuery,
  templatesQuery,
} from '@/lib/template-queries';
import { startEmptyWorkout } from '@/lib/workout-actions';
import { activeWorkoutQuery, groupBy } from '@/lib/workout-queries';
import { formatStartTime } from '@/lib/workout-stats';

const noop = () => {};

export default function StartWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data } = useLiveQuery(activeWorkoutQuery(), []);
  const active = data?.[0];
  const homeWidget = useHomeWidget();

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
  const filed = groupBy(
    [...personal, ...(builtIn ?? [])].filter((template) => template.folderId !== null),
    (template) => template.folderId,
  );

  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const { folderCards, templateCards: myCards, onDrop, onReorder } = useGridDrop(
    (folders ?? [])
      .filter((folder) => !folder.isBuiltIn && folder.parentId === null)
      .map((folder) => toFolderCard(folder, filed.get(folder.id) ?? [])),
    loose.map((t) => toTemplateCard(t, byTemplate.get(t.id) ?? [])),
  );

  const libraryFolders = (folders ?? [])
    .filter((folder) => folder.isBuiltIn)
    .map((folder) => toFolderCard(folder, filed.get(folder.id) ?? []));
  // Every shipped template is filed, so this is only the escape hatch for one
  // that arrives before its folder does.
  const looseBuiltInCards = (builtIn ?? [])
    .filter((t) => t.folderId === null)
    .map((t) => toTemplateCard(t, byTemplate.get(t.id) ?? []));

  const open = (id: string) => router.push({ pathname: '/active', params: { id } });

  const startEmpty = async () => {
    const result = await guard('workout', startEmptyWorkout(), {
      title: t('workout:startFailed'),
      message: t('common:error.tryAgain'),
    });
    if (!result) return;
    if (result.status === 'blocked') {
      setBlockedBy(result.workoutId);
      return;
    }
    haptics.press();
    open(result.workoutId);
  };

  return (
    <TemplateDragProvider onDrop={onDrop} onReorder={onReorder} onDraggingChange={setDragging}>
      <View style={styles.screen}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[styles.container, { paddingTop: TAB_TITLE_INSET }]}
          // The title is content on this screen, so the notch is cleared by the
          // padding above rather than by the scroll view's own adjustment —
          // which only iOS makes, and only from a header this screen has not got.
          contentInsetAdjustmentBehavior="never"
          scrollEnabled={!dragging}>
          <TabTitle title={t('common:screen.home')}>
            <AchievementsButton />
          </TabTitle>

          {/* A single block that never moves; the provider only satisfies the
              hooks the block shares with the Analytics list. */}
          <ExerciseReorderProvider count={1} onReorder={noop} onReorderingChange={noop}>
            <BlockView
              slot={{
                id: homeWidget.widget,
                index: 0,
                draggable: false,
                detailPrefix: '/home',
                onReplace: () => router.push('/home-widget'),
              }}
            />
          </ExerciseReorderProvider>

          {active ? (
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardText}>
                  <ThemedText numberOfLines={1}>{active.name?.trim() || t('workout:defaultName')}</ThemedText>
                  <ThemedText type="footnote" themeColor="textSecondary">
                    {t('workout:startedAt', { time: formatStartTime(active.startedAt) })}
                  </ThemedText>
                </View>
                <ElapsedTime startedAt={active.startedAt} />
              </View>
              <BigButton title={t('templates:home.resume')} onPress={() => open(active.id)} />
            </View>
          ) : (
            <BigButton title={t('templates:home.startEmpty')} onPress={() => void startEmpty()} />
          )}

          <TemplateSection
            title={t('templates:home.myTemplates')}
            templates={myCards}
            folders={folderCards}
            showAdd
            draggable
            emptyHint={t('templates:home.myTemplatesEmpty')}
          />

          <TemplateSection
            title={t('templates:home.library')}
            templates={looseBuiltInCards}
            folders={libraryFolders}
            collapsible
          />
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
    borderRadius: CardRadius,
    borderCurve: 'continuous',
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
