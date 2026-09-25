import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Link, router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/circle-button';
import { ExerciseThumb } from '@/components/exercise-thumb';
import { ExerciseSearchBar, SEARCH_BAR_CLEARANCE } from '@/components/exercise-search-bar';
import { FloatingSurface } from '@/components/floating-surface';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { KeyboardDismissButton } from '@/components/keyboard-dismiss';
import { CustomGroupThumb, MuscleGroupThumb } from '@/components/muscle-map/muscle-group-thumb';
import { Pressable as PressableButton } from '@/components/pressable';
import { ThemedText } from '@/components/themed-text';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import {
  activeFilterCount,
  exerciseFilterWhere,
  exerciseSearchOrderBy,
  isBrowsing,
  ANY,
  EQUIPMENT_MENU,
  NO_FILTERS,
  type ExerciseFilters,
} from '@/lib/exercise-filters';
import { exercisePoster, reportMissingArt } from '@/lib/exercise-media';
import { EXERCISE_GROUPS, exerciseGroup, type ExerciseGroup } from '@/lib/exercise-groups';
import { equipmentLabel, muscleLabel } from '@/lib/exercise-vocabulary';
import * as haptics from '@/lib/haptics';
import { useLibraryLayout } from '@/lib/library-layout';
import { claimCustomExercise } from '@/lib/new-exercise-handoff';
import { attempt } from '@/lib/observability';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The search bar's curve, so the pane and the capsules that sit over it move
 *  as one gesture. */
const TIMING = {
  duration: 260,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

/** How far the groups pane trails behind the incoming list, as a fraction of
 *  the screen — the parallax a native push has. */
const PARALLAX = 0.3;

/**
 * The exercise library, shared by the Exercises tab and every picker sheet.
 * It rests on a list of muscle groups and slides the exercises in from the
 * right once one is picked — or once a search or the equipment filter narrows
 * things down on its own, since either answers the question the groups screen
 * was asking. Clearing everything slides the groups back.
 *
 * Passing `onSelect` turns rows into plain buttons; without it they link to the
 * standalone detail screen. Passing `selectedIds` on top of that makes
 * `onSelect` a toggle and shows a checkmark on picked rows. Selection lives in
 * the host screen, so picks survive moving between groups.
 */
export function ExerciseLibrary({
  onSelect,
  selectedIds,
  newExerciseHref,
  detailHref,
  bottomInset = 0,
  topInset,
}: {
  onSelect?: (exercise: Exercise) => void;
  selectedIds?: ReadonlySet<string>;
  /** Route of this stack's copy of the Add Exercise sheet. */
  newExerciseHref: Href;
  /** Route of this stack's copy of the exercise detail sheet. Only used
   *  alongside `onSelect` — without it the whole row is already the link. */
  detailHref?: (exercise: Exercise) => Href;
  /** Extra padding under the last row: whatever floats over the list in this
   *  host — a sheet footer, or the tab bar itself where that one floats too. */
  bottomInset?: number;
  /** Set to 0 inside a sheet, which already clears the notch. */
  topInset?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);
  const [listKey, setListKey] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const { layout, setLayout } = useLibraryLayout();
  const grid = layout === 'grid';

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(exerciseFilterWhere(filters))
      .orderBy(...exerciseSearchOrderBy(filters)),
    [filters.search, filters.group, filters.equipment]
  );

  const { data: customs } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(and(eq(exercises.isCustom, true), isNull(exercises.deletedAt)))
      .orderBy(asc(exercises.name))
  );

  // An exercise created from this screen's Add Exercise sheet lands in the
  // Custom section, so the section opens and — in a picker — the row is picked,
  // leaving the user one tap from adding what they just wrote. The row is read
  // back here rather than found in `customs`, which is a live query and so can
  // still be a render behind the returning sheet.
  useFocusEffect(
    useCallback(() => {
      const id = claimCustomExercise();
      if (!id) return;

      setCustomOpen(true);
      setFilters(NO_FILTERS);
      if (!onSelect) return;

      void attempt(
        'exercises',
        db
          .select()
          .from(exercises)
          .where(eq(exercises.id, id))
          .then(([created]) => {
            if (created) onSelect(created);
          })
      );
    }, [onSelect])
  );

  // The two platforms hand us the two edges differently, so each one is added
  // exactly once. iOS contributes both safe edges itself through
  // `contentInsetAdjustmentBehavior` — set to "always" because the default only
  // adjusts the *first* scroll view in the screen, and with two panes that
  // would leave whichever list is second sitting under the search row. Its
  // bottom inset already covers the floating tab bar, so adding `insets.bottom`
  // here would clear it twice. Android adjusts neither, and its own tab bar is
  // already the `bottomInset` the host passes.
  const listPadding = {
    paddingTop:
      (topInset ?? (Platform.OS === 'android' ? insets.top : 0)) +
      SEARCH_BAR_CLEARANCE +
      Spacing.two,
    paddingBottom: bottomInset,
  };

  // The empty state overlays the pane rather than the content, so it clears the
  // same two edges by hand — iOS's automatic insets only reach a scroll view.
  const emptyPadding = {
    paddingTop: (topInset ?? insets.top) + SEARCH_BAR_CLEARANCE,
    paddingBottom: bottomInset + (Platform.OS === 'ios' ? insets.bottom : 0),
  };

  // The panes never unmount, so a list left mid-scroll would come back where it
  // was when the next group opens. Remounting it starts it at the top without
  // having to name that offset — on iOS the resting one is negative, because
  // `contentInsetAdjustmentBehavior` holds the content down by the safe area.
  // The key turns over as the pane is asked for, while it still sits off to the
  // right, so neither the rebuild nor the jump is ever on screen.
  const applyFilters = (next: ExerciseFilters) => {
    if (isBrowsing(filters) && !isBrowsing(next)) setListKey((key) => key + 1);
    setFilters(next);
  };

  const isFiltered = filters.search.trim() !== '' || activeFilterCount(filters) > 0;
  const browsing = isBrowsing(filters);
  const group = filters.group === ANY ? undefined : exerciseGroup(filters.group);

  // Derived, not stored: whatever puts a filter on moves the pane forward, and
  // clearing them all brings the groups back. 0 = groups, 1 = exercises.
  const pane = useDerivedValue(() => withTiming(browsing ? 0 : 1, TIMING), [browsing]);

  const groupsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * PARALLAX * pane.value }],
    opacity: 1 - pane.value,
    pointerEvents: pane.value > 0 ? 'none' : 'auto',
  }));

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: width * (1 - pane.value) }],
    pointerEvents: pane.value < 1 ? 'none' : 'auto',
  }));

  return (
    <>
      <ExerciseSearchBar
        filters={filters}
        equipment={EQUIPMENT_MENU}
        onChange={applyFilters}
        onFocusChange={setSearchFocused}
        onFilterOpenChange={setFilterOpen}
        focused={searchFocused}
        showBack={!browsing}
        onBack={() => setFilters(NO_FILTERS)}
        newExerciseHref={newExerciseHref}
        topInset={topInset}
        grid={grid}
        onGridChange={(next) => void attempt('settings', setLayout(next ? 'grid' : 'list'))}
      />

      <Animated.View style={[styles.pane, { backgroundColor: theme.surface }, groupsStyle]}>
        <FlatList
          {...SHEET_SCROLL}
          data={EXERCISE_GROUPS}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="always"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={listPadding}
          ListHeaderComponent={
            customs?.length ? (
              <CustomSection
                exercises={customs}
                open={customOpen}
                onToggle={() => setCustomOpen((open) => !open)}
                onSelect={onSelect}
                detailHref={detailHref}
                selectedIds={selectedIds}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <GroupRow group={item} onPress={() => applyFilters({ ...NO_FILTERS, group: item.id })} />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
          )}
        />
      </Animated.View>

      <Animated.View style={[styles.pane, { backgroundColor: theme.surface }, listStyle]}>
        <FlatList
          {...SHEET_SCROLL}
          // FlatList can't change `numColumns` on a mounted list.
          key={`${listKey}-${layout}`}
          data={data}
          numColumns={grid ? 2 : 1}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="always"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={
            grid ? { ...listPadding, paddingTop: listPadding.paddingTop + Spacing.two } : listPadding
          }
          columnWrapperStyle={grid ? styles.gridRow : undefined}
          extraData={selectedIds}
          renderItem={({ item }) =>
            grid ? (
              <ExerciseTile
                exercise={item}
                onSelect={onSelect}
                detailHref={detailHref}
                selected={selectedIds?.has(item.id) ?? false}
                width={(width - GRID_GAP * 3) / 2}
              />
            ) : (
              <ExerciseRow
                exercise={item}
                onSelect={onSelect}
                detailHref={detailHref}
                selected={selectedIds?.has(item.id) ?? false}
              />
            )
          }
          ItemSeparatorComponent={() =>
            grid ? (
              <View style={styles.gridGap} />
            ) : (
              <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
            )
          }
        />


        {/*
          Not `ListEmptyComponent`: that sits inside the content, under the
          search row's padding, so it can neither centre on the visible pane nor
          stay put — a filled content box scrolls. This is the pane itself.
        */}
        {data?.length === 0 && (
          <EmptyState
            icon={isFiltered || group ? 'magnifyingglass' : 'dumbbell'}
            text={
              isFiltered || group
                ? t('exercises:library.emptyFiltered')
                : t('exercises:library.empty')
            }
            style={[styles.empty, emptyPadding]}
            pointerEvents="box-none">
            {(isFiltered || group) && (
              <ClearFiltersButton onPress={() => setFilters(NO_FILTERS)} />
            )}
          </EmptyState>
        )}
      </Animated.View>

      {/*
        Swallows the tap that dismisses an open filter menu — without it the tap
        leaks to the row underneath and pushes a detail screen. No dim: UIKit
        already dims behind a presented menu, and a second layer on top of that
        reads as a bug.
      */}
      {filterOpen && (
        <AnimatedPressable
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(180)}
          style={styles.scrim}
          onPress={() => setFilterOpen(false)}
          accessibilityLabel={t('exercises:library.dismissFilters')}
        />
      )}

      <KeyboardDismissButton />
    </>
  );
}

/**
 * The exercises the user wrote themselves, above the muscle groups and closed
 * until asked for. They stay in their own group and in search as well — this is
 * a second way in, not a move.
 */
function CustomSection({
  exercises: rows,
  open,
  onToggle,
  onSelect,
  detailHref,
  selectedIds,
}: {
  exercises: Exercise[];
  open: boolean;
  onToggle: () => void;
  onSelect?: (exercise: Exercise) => void;
  detailHref?: (exercise: Exercise) => Href;
  selectedIds?: ReadonlySet<string>;
}) {
  const theme = useTheme();
  const separator = (
    <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
  );

  return (
    <View>
      <GroupRow group={CUSTOM_GROUP} expanded={open} onPress={onToggle} />
      {open && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
          {rows.map((exercise) => (
            <View key={exercise.id}>
              {separator}
              <ExerciseRow
                exercise={exercise}
                onSelect={onSelect}
                detailHref={detailHref}
                selected={selectedIds?.has(exercise.id) ?? false}
              />
            </View>
          ))}
        </Animated.View>
      )}
      {/* `ItemSeparatorComponent` never draws under a list header. */}
      {separator}
    </View>
  );
}

const CLEAR_HEIGHT = 40;

function ClearFiltersButton({ onPress }: { onPress: () => void }) {
  return (
    <FloatingSurface style={styles.clear}>
      <PressableButton
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.clearBody, pressed && styles.clearPressed]}>
        <ThemedText type="subhead" weight="semibold" themeColor="accent">
          {t('exercises:library.clearFilters')}
        </ThemedText>
      </PressableButton>
    </FloatingSurface>
  );
}

const CUSTOM_GROUP: ExerciseGroup = { id: 'custom', title: t('exercises:library.custom') };

function GroupRow({
  group,
  onPress,
  expanded,
}: {
  group: ExerciseGroup;
  onPress: () => void;
  /** Set only by an accordion header: turns the chevron down when open. */
  expanded?: boolean;
}) {
  const theme = useTheme();
  const turn = useDerivedValue(() => withTiming(expanded ? 1 : 0, TIMING), [expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 90}deg` }],
  }));

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}>
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.surface,
            },
          ]}>
          {group === CUSTOM_GROUP ? (
            <CustomGroupThumb />
          ) : (
            <MuscleGroupThumb group={group} />
          )}
          <ThemedText style={styles.rowText}>{group.title}</ThemedText>
          <Animated.View style={chevronStyle}>
            <Icon name="chevron.right" size={16} tintColor={theme.textSecondary} />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

function ExerciseRow({
  exercise,
  onSelect,
  detailHref,
  selected,
}: {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  detailHref?: (exercise: Exercise) => Href;
  selected: boolean;
}) {
  const theme = useTheme();
  const detail = [
    exercise.equipment && equipmentLabel(exercise.equipment),
    exercise.primaryMuscles[0] && muscleLabel(exercise.primaryMuscles[0]),
  ]
    .filter(Boolean)
    .join(' · ');

  const body = ({ pressed }: { pressed: boolean }) => (
    <View
      style={[styles.row, { backgroundColor: pressed ? theme.backgroundSelected : theme.surface }]}>
      <ExerciseThumb art={exercise} />
      <View style={styles.rowText}>
        <ThemedText numberOfLines={1}>{exercise.name}</ThemedText>
        {detail !== '' && (
          <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        )}
      </View>
      {selected && <Icon name="checkmark" size={20} tintColor={theme.accent} />}
      {onSelect && detailHref && (
        <CircleButton
          symbol="info"
          label={t('exercises:about', { name: exercise.name })}
          onPress={() => router.push(detailHref(exercise))}
        />
      )}
    </View>
  );

  if (onSelect)
    return (
      <Pressable
        onPress={() => {
          haptics.select();
          onSelect(exercise);
        }}>
        {body}
      </Pressable>
    );

  return (
    <Link href={{ pathname: '/exercises/[id]', params: { id: exercise.id } }} asChild>
      {/*
        `Link asChild` clones its child and overwrites `style`, so the row
        layout has to live on an inner View rather than on the Pressable.
      */}
      <Pressable onPress={haptics.tap}>{body}</Pressable>
    </Link>
  );
}

function ExerciseTile({
  exercise,
  onSelect,
  detailHref,
  selected,
  width,
}: {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  detailHref?: (exercise: Exercise) => Href;
  selected: boolean;
  /** Set rather than flexed, so an odd last tile keeps its column's width. */
  width: number;
}) {
  const theme = useTheme();
  const poster = exercisePoster(exercise);
  const detail = [
    exercise.equipment && equipmentLabel(exercise.equipment),
    exercise.primaryMuscles[0] && muscleLabel(exercise.primaryMuscles[0]),
  ]
    .filter(Boolean)
    .join(' · ');

  const body = ({ pressed }: { pressed: boolean }) => (
    <View>
      <View
        style={[
          styles.tileImage,
          { width, height: width / POSTER_ASPECT, backgroundColor: theme.backgroundElement },
        ]}>
        {poster && (
          <Image
            source={poster}
            style={[styles.image, pressed && styles.tilePressed]}
            contentFit="cover"
            onError={(error) => reportMissingArt(exercise, error)}
          />
        )}
        {selected && (
          <View style={[styles.tileCheck, { backgroundColor: theme.accent }]}>
            <Icon name="checkmark" size={16} tintColor={theme.accentContent} />
          </View>
        )}
        {onSelect && detailHref && (
          <View style={styles.tileInfo}>
            <CircleButton
              symbol="info"
              size={TILE_BUTTON_SIZE}
              symbolSize={16}
              label={t('exercises:about', { name: exercise.name })}
              onPress={() => router.push(detailHref(exercise))}
            />
          </View>
        )}
      </View>
      <ThemedText type="subhead" weight="medium" numberOfLines={2}>
        {exercise.name}
      </ThemedText>
      {detail !== '' && (
        <ThemedText type="caption1" themeColor="textSecondary" numberOfLines={1}>
          {detail}
        </ThemedText>
      )}
    </View>
  );

  if (onSelect)
    return (
      <Pressable
        style={{ width }}
        onPress={() => {
          haptics.select();
          onSelect(exercise);
        }}>
        {body}
      </Pressable>
    );

  return (
    <View style={{ width }}>
      <Link href={{ pathname: '/exercises/[id]', params: { id: exercise.id } }} asChild>
        <Pressable onPress={haptics.tap}>{body}</Pressable>
      </Link>
    </View>
  );
}

const TILE_BUTTON_SIZE = 32;
const TILE_BUTTON_INSET = Spacing.one;

/** Every gap in the grid — edges, gutter, rows and under the search row — matches the screen margin. */
const GRID_GAP = Spacing.three;

/** The bundled posters are the clip's first frame, 720×402. */
const POSTER_ASPECT = 720 / 402;

const styles = StyleSheet.create({
  pane: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.six,
  },
  emptyText: {
    textAlign: 'center',
  },
  clear: {
    borderRadius: CLEAR_HEIGHT / 2,
  },
  clearBody: {
    minHeight: CLEAR_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  clearPressed: {
    opacity: 0.6,
  },
  gridRow: {
    gap: GRID_GAP,
    paddingHorizontal: GRID_GAP,
  },
  gridGap: {
    height: GRID_GAP,
  },
  // Sized outright from the tile width: left to `aspectRatio`, the poster came
  // out narrower than its column and the gutter and right margin doubled.
  tileImage: {
    // Concentric with the corner buttons: their inset plus their radius.
    borderRadius: TILE_BUTTON_INSET + TILE_BUTTON_SIZE / 2,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  image: {
    flex: 1,
  },
  tilePressed: {
    opacity: 0.7,
  },
  tileCheck: {
    position: 'absolute',
    top: TILE_BUTTON_INSET,
    right: TILE_BUTTON_INSET,
    width: TILE_BUTTON_SIZE,
    height: TILE_BUTTON_SIZE,
    borderRadius: TILE_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileInfo: {
    position: 'absolute',
    right: TILE_BUTTON_INSET,
    bottom: TILE_BUTTON_INSET,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Below the search row (zIndex 10), above the list.
    zIndex: 5,
  },
});
