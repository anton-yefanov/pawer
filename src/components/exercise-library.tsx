import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { Link, router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CircleButton } from '@/components/circle-button';
import { ExerciseSearchBar, SEARCH_BAR_CLEARANCE } from '@/components/exercise-search-bar';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import {
  activeFilterCount,
  exerciseFilterWhere,
  exerciseSearchOrderBy,
  EQUIPMENT_MENU,
  MUSCLE_MENU,
  NO_FILTERS,
  type ExerciseFilters,
} from '@/lib/exercise-filters';
import { exerciseThumbnail } from '@/lib/exercise-images';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The searchable exercise list, shared by the Exercises tab and the in-workout
 * picker. Passing `onSelect` turns rows into plain buttons; without it they
 * link to the standalone detail screen. Passing `selectedIds` on top of that
 * makes `onSelect` a toggle and shows a checkmark on picked rows.
 */
export function ExerciseLibrary({
  onSelect,
  selectedIds,
  newExerciseHref,
  detailHref,
  bottomInset = BottomTabInset + Spacing.four,
  topInset,
}: {
  onSelect?: (exercise: Exercise) => void;
  selectedIds?: ReadonlySet<string>;
  /** Route of this stack's copy of the Add Exercise sheet. */
  newExerciseHref: Href;
  /** Route of this stack's copy of the exercise detail sheet. Only used
   *  alongside `onSelect` — without it the whole row is already the link. */
  detailHref?: (exercise: Exercise) => Href;
  bottomInset?: number;
  /** Set to 0 inside a sheet, which already clears the notch. */
  topInset?: number;
}) {
  const theme = useTheme();
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(exerciseFilterWhere(filters))
      .orderBy(...exerciseSearchOrderBy(filters)),
    [filters.search, filters.muscle, filters.equipment]
  );

  const isFiltered = filters.search.trim() !== '' || activeFilterCount(filters) > 0;

  return (
    <>
      <ExerciseSearchBar
        filters={filters}
        muscles={MUSCLE_MENU}
        equipment={EQUIPMENT_MENU}
        onChange={setFilters}
        onFocusChange={setSearchFocused}
        onFilterOpenChange={setFilterOpen}
        focused={searchFocused}
        newExerciseHref={newExerciseHref}
        topInset={topInset}
      />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        // The padding is only the floating row's own height: UIKit contributes
        // the safe area on top of it, so adding `insets.top` here double-counts
        // the notch and leaves an empty band under the row.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{
          paddingTop: (topInset ?? 0) + SEARCH_BAR_CLEARANCE + Spacing.two,
          paddingBottom: bottomInset,
        }}
        style={{ backgroundColor: theme.surface }}
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
        ListEmptyComponent={
          <ThemedText style={styles.empty} themeColor="textSecondary">
            {isFiltered
              ? 'No exercises match these filters.'
              : 'No exercises. The library seeds on first launch.'}
          </ThemedText>
        }
      />

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
    </>
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
      style={[
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.surface },
      ]}>
      <Image source={exerciseThumbnail(exercise.sourceId)} style={styles.thumb} contentFit="contain" />
      <View style={styles.rowText}>
        <ThemedText numberOfLines={1}>{exercise.name}</ThemedText>
        {detail !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        )}
      </View>
      {selected && <SymbolView name="checkmark" size={20} tintColor={theme.accent} />}
      {onSelect && detailHref && (
        <CircleButton
          symbol="info"
          label={`About ${exercise.name}`}
          onPress={() => router.push(detailHref(exercise))}
        />
      )}
    </View>
  );

  if (onSelect) return <Pressable onPress={() => onSelect(exercise)}>{body}</Pressable>;

  return (
    <Link href={{ pathname: '/exercises/[id]', params: { id: exercise.id } }} asChild>
      {/*
        `Link asChild` clones its child and overwrites `style`, so the row
        layout has to live on an inner View rather than on the Pressable.
      */}
      <Pressable>{body}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  thumb: {
    width: 48,
    height: 48,
  },
  rowText: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48 + Spacing.three * 2,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.six,
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
