import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
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
import { Icon } from '@/components/icon';
import { KeyboardDismissButton } from '@/components/keyboard-dismiss';
import { Pressable as PressableButton } from '@/components/pressable';
import { ThemedText } from '@/components/themed-text';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
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
import { EXERCISE_GROUPS, exerciseGroup, type ExerciseGroup } from '@/lib/exercise-groups';
import * as haptics from '@/lib/haptics';
import { claimCustomExercise } from '@/lib/new-exercise-handoff';

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
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

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

      void db
        .select()
        .from(exercises)
        .where(eq(exercises.id, id))
        .then(([created]) => {
          if (created) onSelect(created);
        });
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
        onChange={setFilters}
        onFocusChange={setSearchFocused}
        onFilterOpenChange={setFilterOpen}
        focused={searchFocused}
        showBack={!browsing}
        onBack={() => setFilters(NO_FILTERS)}
        placeholder={group ? `Search ${group.title.toLowerCase()}` : 'Search'}
        newExerciseHref={newExerciseHref}
        topInset={topInset}
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
            <GroupRow group={item} onPress={() => setFilters({ ...NO_FILTERS, group: item.id })} />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
          )}
        />
      </Animated.View>

      <Animated.View style={[styles.pane, { backgroundColor: theme.surface }, listStyle]}>
        <FlatList
          {...SHEET_SCROLL}
          data={data}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="always"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={listPadding}
          extraData={selectedIds}
          renderItem={({ item }) => (
            <ExerciseRow
              exercise={item}
              onSelect={onSelect}
              detailHref={detailHref}
              selected={selectedIds?.has(item.id) ?? false}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
          )}
        />

        {/*
          Not `ListEmptyComponent`: that sits inside the content, under the
          search row's padding, so it can neither centre on the visible pane nor
          stay put — a filled content box scrolls. This is the pane itself.
        */}
        {data?.length === 0 && (
          <View style={[styles.empty, emptyPadding]} pointerEvents="box-none">
            <ThemedText style={styles.emptyText} themeColor="textSecondary">
              {isFiltered || group
                ? 'No exercises match these filters.'
                : 'No exercises. The library seeds on first launch.'}
            </ThemedText>
            {(isFiltered || group) && (
              <ClearFiltersButton onPress={() => setFilters(NO_FILTERS)} />
            )}
          </View>
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
          accessibilityLabel="Dismiss filters"
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
  const theme = useTheme();

  return (
    <FloatingSurface style={styles.clear}>
      <PressableButton
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.clearBody, pressed && styles.clearPressed]}>
        <ThemedText style={[styles.clearLabel, { color: theme.accent }]}>Clear filters</ThemedText>
      </PressableButton>
    </FloatingSurface>
  );
}

const CUSTOM_GROUP: ExerciseGroup = { id: 'custom', title: 'Custom' };

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
            styles.groupRow,
            {
              backgroundColor: pressed ? theme.backgroundSelected : theme.surface,
            },
          ]}>
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
  const detail = [exercise.equipment, exercise.primaryMuscles[0]].filter(Boolean).join(' · ');

  const body = ({ pressed }: { pressed: boolean }) => (
    <View
      style={[styles.row, { backgroundColor: pressed ? theme.backgroundSelected : theme.surface }]}>
      <ExerciseThumb art={exercise} />
      <View style={styles.rowText}>
        <ThemedText numberOfLines={1}>{exercise.name}</ThemedText>
        {detail !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        )}
      </View>
      {selected && <Icon name="checkmark" size={20} tintColor={theme.accent} />}
      {onSelect && detailHref && (
        <CircleButton
          symbol="info"
          label={`About ${exercise.name}`}
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
  groupRow: {
    paddingVertical: Spacing.three,
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
  clearLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearPressed: {
    opacity: 0.6,
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
