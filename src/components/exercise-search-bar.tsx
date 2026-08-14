import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, useFocusEffect, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseFacetMenu } from '@/components/exercise-filter-menu';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseFilters, FacetMenu } from '@/lib/exercise-filters';
import * as haptics from '@/lib/haptics';

const SEARCH_BAR_HEIGHT = 48;
const TOP_GAP = Spacing.one;
const GAP = Spacing.two;

/** Both facet menus in one capsule: two square halves plus the rule between
 *  them. Anything narrower clips a half. */
const FILTER_PAIR_WIDTH = SEARCH_BAR_HEIGHT * 2 + StyleSheet.hairlineWidth;

/** Room for "Cancel" at 17pt plus its leading gap. Fixed so the label never
 *  reflows mid-animation the way a measured width would. */
const CANCEL_WIDTH = 62;

/**
 * Deliberately timing, not spring. A spring overshoots past both ends, and
 * every value here drives a *width* — overshoot means negative widths on one
 * end and capsules wider than their resting size on the other. The curve is
 * UIKit's standard ease-out for bar transitions.
 */
const TIMING = {
  duration: 260,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

/**
 * The transition runs in two halves that never overlap: the filter capsule
 * clears out over [0, MIDPOINT], then Cancel moves in over [MIDPOINT, 1].
 *
 * Overlapping them is what caused the glitch frames — an element whose opacity
 * had already reached 0 while its width was still holding a chunk of the row,
 * leaving a gap with nothing in it.
 */
const MIDPOINT = 0.5;

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

/**
 * Height the row occupies *below* the safe-area inset.
 *
 * A scroll view underneath this row should use it as top padding and let its
 * `contentInsetAdjustmentBehavior` (default `automatic`) contribute the safe
 * area itself. Adding `insets.top` to this value double-counts the notch and
 * leaves a conspicuous empty band under the row.
 */
export const SEARCH_BAR_CLEARANCE = TOP_GAP + SEARCH_BAR_HEIGHT;

/**
 * Floating search + filter row.
 *
 * This is deliberately not `headerSearchBarOptions`. UIKit's `integrated` search
 * field has an intrinsic width and will not stretch, so a native bar can't fill
 * the viewport the way the design calls for — the button ends up marooned at one
 * edge. Building the row gives us full-width layout at the cost of
 * reimplementing focus and clear behaviour, which `TextInput` mostly covers.
 *
 * Glass comes from expo-glass-effect. `GlassContainer` lets the two capsules
 * merge as they approach each other, the way system glass elements do, and
 * `isInteractive` is what gives each capsule the liquid-glass press response —
 * without it the glass is inert under a finger.
 *
 * Focusing runs the system's search transition: the filter pair and the "+"
 * collapse into the field (glass merging as it goes), the field takes the freed
 * width, and Cancel slides in. Driving it from a shared value keeps the whole thing on
 * the UI thread, so it doesn't stutter behind the keyboard animation.
 */
export function ExerciseSearchBar({
  filters,
  muscles,
  equipment,
  onChange,
  onFocusChange,
  onFilterOpenChange,
  focused,
  newExerciseHref,
  topInset,
}: {
  filters: ExerciseFilters;
  muscles: FacetMenu;
  equipment: FacetMenu;
  onChange: (next: ExerciseFilters) => void;
  onFocusChange: (focused: boolean) => void;
  onFilterOpenChange: (open: boolean) => void;
  focused: boolean;
  /** Where "+" leads. Each stack registers its own copy of the sheet, so the
   *  route differs per host screen. */
  newExerciseHref: Href;
  /** Overrides the safe-area inset. A sheet already starts below the notch, so
   *  the window inset would push the row a long way down inside it. */
  topInset?: number;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const input = useRef<TextInput>(null);

  // Leaving the screen gives up the field for good. Without this UIKit restores
  // first responder to the last focused field when the detail screen pops, so
  // search would reopen on its own; blurring on the way out leaves nothing to
  // restore, and the blur on re-entry catches a restore that slipped through.
  useFocusEffect(
    useCallback(() => {
      input.current?.blur();
      onFocusChange(false);
      return () => {
        input.current?.blur();
        onFocusChange(false);
      };
    }, [onFocusChange])
  );

  const fallback = isLiquidGlassAvailable()
    ? undefined
    : { backgroundColor: theme.surface };

  // 0 = resting, 1 = focused. `useDerivedValue` keeps the animation in sync
  // with the prop, so programmatic blurs animate the same as user taps.
  const progress = useDerivedValue(() => withTiming(focused ? 1 : 0, TIMING), [focused]);

  // Width and opacity share an input range, so a capsule is fully faded at the
  // exact moment it stops taking space — no sliver, no empty slot. Every
  // interpolation is CLAMPed; unclamped, the ends produce negative widths.
  const filtersStyle = useAnimatedStyle(() => {
    const out = interpolate(progress.value, [0, MIDPOINT], [1, 0], Extrapolation.CLAMP);
    return {
      width: FILTER_PAIR_WIDTH * out,
      // Swallows the row gap along with the capsule, so the field doesn't stop
      // short of the leading edge.
      marginRight: -GAP * (1 - out),
      opacity: out,
      // As a style rather than a prop: the native glass view doesn't forward
      // the `pointerEvents` prop, so a collapsed capsule would still take taps.
      pointerEvents: out < 1 ? 'none' : 'auto',
    };
  });

  const plusStyle = useAnimatedStyle(() => {
    const out = interpolate(progress.value, [0, MIDPOINT], [1, 0], Extrapolation.CLAMP);
    return {
      width: SEARCH_BAR_HEIGHT * out,
      marginLeft: -GAP * (1 - out),
      opacity: out,
      pointerEvents: out < 1 ? 'none' : 'auto',
    };
  });

  const cancelStyle = useAnimatedStyle(() => {
    const inn = interpolate(progress.value, [MIDPOINT, 1], [0, 1], Extrapolation.CLAMP);
    return {
      width: CANCEL_WIDTH * inn,
      opacity: inn,
      pointerEvents: inn > 0 ? 'auto' : 'none',
    };
  });

  return (
    <View style={[styles.container, { top: (topInset ?? insets.top) + TOP_GAP }]}>
      <GlassContainer spacing={GAP} style={styles.glassRow}>
        <AnimatedGlassView isInteractive style={[styles.filters, fallback, filtersStyle]}>
          <View style={styles.clip}>
            <View style={styles.filterContent}>
              <ExerciseFacetMenu
                title="Muscle"
                anyLabel="Any muscle"
                systemName="figure.strengthtraining.traditional"
                menu={muscles}
                value={filters.muscle}
                onChange={(muscle) => onChange({ ...filters, muscle })}
                onOpenChange={onFilterOpenChange}
                restingTint={theme.text}
                size={SEARCH_BAR_HEIGHT}
              />
            </View>
            {/* Inset top and bottom so the rule reads as a separator between two
                segments rather than a cut through the capsule. */}
            <View style={[styles.divider, { backgroundColor: theme.textSecondary }]} />
            <View style={styles.filterContent}>
              <ExerciseFacetMenu
                title="Equipment"
                anyLabel="Any equipment"
                systemName="dumbbell"
                menu={equipment}
                value={filters.equipment}
                onChange={(value) => onChange({ ...filters, equipment: value })}
                onOpenChange={onFilterOpenChange}
                restingTint={theme.text}
                size={SEARCH_BAR_HEIGHT}
              />
            </View>
          </View>
        </AnimatedGlassView>

        <GlassView isInteractive style={[styles.field, fallback]}>
          <Pressable
            style={styles.fieldContent}
            onPress={() => input.current?.focus()}
            accessibilityRole="search">
            <SymbolView name="magnifyingglass" size={20} tintColor={theme.textSecondary} />
            <TextInput
              ref={input}
              value={filters.search}
              onChangeText={(search) => onChange({ ...filters, search })}
              onFocus={() => onFocusChange(true)}
              onBlur={() => onFocusChange(false)}
              placeholder="Search"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </Pressable>
        </GlassView>

        <AnimatedGlassView isInteractive style={[styles.plus, fallback, plusStyle]}>
          <View style={styles.clip}>
            <Pressable
              style={styles.filterContent}
              onPress={() => {
                haptics.tap();
                router.push(newExerciseHref);
              }}
              accessibilityRole="button"
              accessibilityLabel="New exercise">
              <SymbolView name="plus" size={22} tintColor={theme.text} />
            </Pressable>
          </View>
        </AnimatedGlassView>
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  glassRow: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  // A glass capsule must never clip itself: `overflow: 'hidden'` sets
  // `clipsToBounds` on the host view, and UIGlassEffect's interactive stretch
  // draws *outside* those bounds — clipped, the glass deforms inside an invisible
  // box under a finger instead of flowing past it. The clipping the collapse
  // animation needs happens one level in, on `clip`.
  filters: {
    height: SEARCH_BAR_HEIGHT,
    borderRadius: SEARCH_BAR_HEIGHT / 2,
  },
  clip: {
    height: SEARCH_BAR_HEIGHT,
    borderRadius: SEARCH_BAR_HEIGHT / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: SEARCH_BAR_HEIGHT - Spacing.four,
    opacity: 0.3,
  },
  plus: {
    height: SEARCH_BAR_HEIGHT,
    borderRadius: SEARCH_BAR_HEIGHT / 2,
  },
  filterContent: {
    width: SEARCH_BAR_HEIGHT,
    height: SEARCH_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flex: 1,
    height: SEARCH_BAR_HEIGHT,
    borderRadius: SEARCH_BAR_HEIGHT / 2,
  },
  fieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  cancel: {
    height: SEARCH_BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  // Colored at the render site with `theme.accent`, the same tint the filter
  // menu uses when a facet is active.
  cancelLabel: {
    fontSize: 17,
    paddingLeft: Spacing.two,
  },
});
