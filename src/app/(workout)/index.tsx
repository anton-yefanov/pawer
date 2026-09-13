import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AchievementsButton } from '@/components/achievements/achievements-button';
import { TemplateDragProvider } from '@/components/templates/template-drag';
import { TemplateSection } from '@/components/templates/template-section';
import { useGridDrop } from '@/components/templates/use-grid-drop';
import { ThemedText } from '@/components/themed-text';
import { ActiveWorkoutPrompt } from '@/components/workout/active-workout-prompt';
import { BigButton } from '@/components/workout/big-button';
import { ElapsedTime } from '@/components/workout/elapsed-time';
import { BottomTabInset, CardRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { toFolderCard, toTemplateCard } from '@/lib/template-cards';
import {
  foldersQuery,
  templateCardExercisesQuery,
  templatesQuery,
} from '@/lib/template-queries';
import { startEmptyWorkout } from '@/lib/workout-actions';
import { activeWorkoutQuery, groupBy } from '@/lib/workout-queries';
import { formatStartTime } from '@/lib/workout-stats';

import { guard } from '@/lib/observability';


export default function StartWorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const { folderCards, templateCards: myCards, onDrop, onReorder } = useGridDrop(
    (folders ?? [])
      .filter((folder) => folder.parentId === null)
      .map((folder) => toFolderCard(folder, byFolder.get(folder.id) ?? [])),
    loose.map((t) => toTemplateCard(t, byTemplate.get(t.id) ?? [])),
  );
  const builtInCards = (builtIn ?? []).map((t) => toTemplateCard(t, byTemplate.get(t.id) ?? []));

  const open = (id: string) => router.push({ pathname: '/active', params: { id } });

  const startEmpty = async () => {
    const result = await guard('workout', startEmptyWorkout(), {
      title: 'Couldn’t start workout',
      message: 'Please try again.',
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
          contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.two }]}
          // The title is content on this screen, so the notch is cleared by the
          // padding above rather than by the scroll view's own adjustment —
          // which only iOS makes, and only from a header this screen has not got.
          contentInsetAdjustmentBehavior="never"
          scrollEnabled={!dragging}>
          <View style={styles.title}>
            <ThemedText type="largeTitle">Home</ThemedText>
            <AchievementsButton />
          </View>

          {active ? (
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardText}>
                  <ThemedText numberOfLines={1}>{active.name?.trim() || 'Workout'}</ThemedText>
                  <ThemedText type="footnote" themeColor="textSecondary">
                    Started {formatStartTime(active.startedAt)}
                  </ThemedText>
                </View>
                <ElapsedTime startedAt={active.startedAt} />
              </View>
              <BigButton title="Resume Workout" onPress={() => open(active.id)} />
            </View>
          ) : (
            <BigButton title="Start an Empty Workout" onPress={() => void startEmpty()} />
          )}

          <TemplateSection
            title="My Templates"
            templates={myCards}
            folders={folderCards}
            showAdd
            draggable
            emptyHint="Add a template with the plus button, or duplicate one below"
          />

          <TemplateSection title="Library" templates={builtInCards} collapsible />
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
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
