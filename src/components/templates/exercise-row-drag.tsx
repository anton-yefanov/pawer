import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Long-press an exercise row in the template editor and it lifts, then drags
 * past its neighbours to reorder.
 *
 * `workout/exercise-reorder.tsx` with the fold removed: these rows are already
 * a uniform lattice, so an index maps to a slot by arithmetic alone and there
 * is nothing to collapse first. The lifted row stays in the layout flow and
 * moves by the gesture's own translation; the rows it displaces slide by the
 * difference between their index and the one the drop would give them.
 *
 * Rows read the shared values but never write them: every write is a worklet
 * declared here, beside the `useSharedValue` that owns it.
 */

/** Long enough that a tap on the remove button isn't a lift. */
const LIFT_DELAY = 250;
const SHIFT = 180;
const SNAP_BACK = 180;
const IDLE = -1;

export const ROW_HEIGHT = 48;
const PITCH = ROW_HEIGHT + Spacing.three;

type ReorderContextValue = {
  draggingId: SharedValue<string>;
  fromIndex: SharedValue<number>;
  dropIndex: SharedValue<number>;
  translateY: SharedValue<number>;
  settling: SharedValue<number>;
  /** Clears the drag offsets, once the list has re-rendered in its new order. */
  settle: () => void;
  beginDrag: (id: string, index: number) => void;
  moveDrag: (translationY: number) => void;
  endDrag: (committed: boolean) => void;
  reorder: (from: number, to: number) => void;
  setReordering: (reordering: boolean) => void;
};

const ReorderContext = createContext<ReorderContextValue | null>(null);

function useRowReorder(): ReorderContextValue {
  const value = useContext(ReorderContext);
  if (!value) throw new Error('useRowReorder outside ExerciseRowReorderProvider');
  return value;
}

/** Renders no view of its own, so it can wrap a ScrollView without changing layout. */
export function ExerciseRowReorderProvider({
  ids,
  onReorder,
  onReorderingChange,
  children,
}: {
  /** The rows as currently rendered, so a drop can be settled once it lands. */
  ids: readonly string[];
  onReorder: (from: number, to: number) => void;
  onReorderingChange: (reordering: boolean) => void;
  children: React.ReactNode;
}) {
  const draggingId = useSharedValue('');
  const fromIndex = useSharedValue(IDLE);
  const dropIndex = useSharedValue(IDLE);
  const translateY = useSharedValue(0);
  const settling = useSharedValue(0);
  const rowCount = useSharedValue(ids.length);
  const lastSlot = useSharedValue(IDLE);
  const dropped = useRef(false);

  useEffect(() => {
    rowCount.value = ids.length;
  }, [ids.length, rowCount]);

  // Held in a ref so the context value stays stable: the callbacks close over
  // the live draft order, which changes on every write.
  const callbacks = useRef({ onReorder, onReorderingChange });
  useEffect(() => {
    callbacks.current = { onReorder, onReorderingChange };
  });

  const value = useMemo<ReorderContextValue>(() => {
    return {
      draggingId,
      fromIndex,
      dropIndex,
      translateY,
      settling,

      settle: () => {
        settling.value = 1;
        fromIndex.value = IDLE;
        dropIndex.value = IDLE;
        translateY.value = 0;
        draggingId.value = '';
      },

      beginDrag: (id, index) => {
        'worklet';
        draggingId.value = id;
        fromIndex.value = index;
        dropIndex.value = IDLE;
        lastSlot.value = index;
        translateY.value = 0;
        settling.value = 0;
        runOnJS(liftHaptic)();
      },

      moveDrag: (translationY) => {
        'worklet';
        translateY.value = translationY;

        const raw = Math.round((fromIndex.value * PITCH + translationY) / PITCH);
        const slot = Math.min(Math.max(raw, 0), rowCount.value - 1);
        if (slot !== lastSlot.value) {
          lastSlot.value = slot;
          runOnJS(tickHaptic)();
        }
        dropIndex.value = slot;
      },

      /** A committed release is settled by the layout effect below, not here. */
      endDrag: (committed) => {
        'worklet';
        if (committed) return;

        fromIndex.value = IDLE;
        dropIndex.value = IDLE;
        translateY.value = withTiming(0, { duration: SNAP_BACK }, (finished) => {
          if (finished) draggingId.value = '';
        });
      },

      reorder: (from, to) => {
        dropped.current = true;
        callbacks.current.onReorder(from, to);
      },
      setReordering: (reordering) => callbacks.current.onReorderingChange(reordering),
    };
    // Shared values are stable for the provider's lifetime. Listing them would
    // make the compiler treat them as hook arguments and reject the writes
    // above, so the two rules can't both be satisfied here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * A drop leaves every offset exactly as the finger left it and clears them
   * here — in the commit that first renders the new order. Clearing them in the
   * drop handler instead runs a frame early: the rows are still in their old
   * order at that point, so they all snap back to where they started and the
   * whole list jumps a slot once the re-render lands.
   */
  useLayoutEffect(() => {
    if (!dropped.current) return;
    dropped.current = false;
    value.settle();
  }, [ids, value]);

  return <ReorderContext value={value}>{children}</ReorderContext>;
}

/**
 * Where a row sits while a drag is in flight: the lifted one follows the
 * finger, the ones it has displaced slide one slot along.
 */
function useRowMotion(id: string, index: number) {
  const { draggingId, fromIndex, dropIndex, translateY, settling } = useRowReorder();

  return useAnimatedStyle(() => {
    if (draggingId.value === id) {
      return {
        transform: [
          { translateY: translateY.value },
          { scale: withTiming(1.03, { duration: 140 }) },
        ],
        shadowOpacity: withTiming(0.18, { duration: 140 }),
        zIndex: 2,
      };
    }

    const from = fromIndex.value;
    const to = dropIndex.value;
    let displaced = index;
    if (from !== IDLE && to !== IDLE && from !== to) {
      if (from < to && index > from && index <= to) displaced = index - 1;
      else if (to < from && index >= to && index < from) displaced = index + 1;
    }
    const shiftY = (displaced - index) * PITCH;

    // Settling: the list has just re-rendered with everyone in their new slot,
    // so the offsets are already zero and the translation has to land there in
    // the same frame — animating to zero from here would slide each row a slot
    // further than it should go. Only the lift itself keeps easing out.
    if (settling.value === 1) {
      return {
        transform: [{ translateY: shiftY }, { scale: withTiming(1, { duration: 140 }) }],
        shadowOpacity: withTiming(0, { duration: 140 }),
        zIndex: 0,
      };
    }

    return {
      transform: [
        { translateY: withTiming(shiftY, { duration: SHIFT }) },
        { scale: withTiming(1, { duration: 140 }) },
      ],
      shadowOpacity: withTiming(0, { duration: 140 }),
      zIndex: 0,
    };
  });
}

export function DraggableExerciseRow({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const reorder = useRowReorder();
  const motion = useRowMotion(id, index);

  // Carries the outcome from onEnd to onFinalize, which always runs.
  const committed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LIFT_DELAY)
    .onStart(() => {
      reorder.beginDrag(id, index);
      runOnJS(reorder.setReordering)(true);
    })
    .onUpdate((event) => {
      reorder.moveDrag(event.translationY);
    })
    .onEnd(() => {
      const to = reorder.dropIndex.value;
      if (to >= 0 && to !== index) {
        runOnJS(reorder.reorder)(index, to);
        committed.value = true;
      }
    })
    .onFinalize(() => {
      reorder.endDrag(committed.value);
      committed.value = false;
      runOnJS(reorder.setReordering)(false);
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.row, { backgroundColor: theme.surface, shadowColor: theme.shadow }, motion]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});

function liftHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function tickHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
