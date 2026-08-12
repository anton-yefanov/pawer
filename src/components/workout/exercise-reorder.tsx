import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';

/**
 * Long-press an exercise name and the whole logger folds down to a column of
 * name chips, which then drag past each other to reorder.
 *
 * Collapsing first is what makes the drag cheap: every row ends up the same
 * height, so the list is a uniform lattice and an index maps to a slot by
 * arithmetic alone — nothing is ever measured. The lifted row stays in the
 * layout flow and moves by the gesture's own translation, and the rows it
 * displaces slide by the difference between their index and the one the drop
 * would give them. This is `templates/template-drag.tsx` with one column and no
 * folders.
 *
 * The drop slot is read off the *dragged row's* position rather than the
 * finger's, because the two part company during the fold: the row travels to
 * its collapsed slot while the finger stays put. Reading the row keeps the snap
 * on release under half a slot however far the list compacted.
 *
 * Rows read the shared values but never write them: every write is a worklet
 * declared here, beside the `useSharedValue` that owns it.
 */

/** The fold, and its mirror on release. */
const COLLAPSE = 220;
const SHIFT = 180;
const SNAP_BACK = 180;
const IDLE = -1;

export const COLLAPSED_ROW = 44;
const PITCH = COLLAPSED_ROW + Spacing.three;

type ReorderContextValue = {
  progress: SharedValue<number>;
  draggingId: SharedValue<string>;
  fromIndex: SharedValue<number>;
  dropIndex: SharedValue<number>;
  translateY: SharedValue<number>;
  settling: SharedValue<number>;
  beginDrag: (id: string, index: number) => void;
  moveDrag: (translationY: number) => void;
  endDrag: (committed: boolean) => void;
  reorder: (from: number, to: number) => void;
  setReordering: (reordering: boolean) => void;
};

/** Clears the drag offsets. Call it in the same tick as the state update. */
export type Settle = () => void;

const ReorderContext = createContext<ReorderContextValue | null>(null);

export function useExerciseReorder(): ReorderContextValue {
  const value = useContext(ReorderContext);
  if (!value) throw new Error('useExerciseReorder outside ExerciseReorderProvider');
  return value;
}

/** Renders no view of its own, so it can wrap a ScrollView without changing layout. */
export function ExerciseReorderProvider({
  count,
  onReorder,
  onReorderingChange,
  children,
}: {
  count: number;
  onReorder: (from: number, to: number, settle: Settle) => void;
  onReorderingChange: (reordering: boolean) => void;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);
  const ready = useSharedValue(0);
  const draggingId = useSharedValue('');
  const fromIndex = useSharedValue(IDLE);
  const dropIndex = useSharedValue(IDLE);
  const translateY = useSharedValue(0);
  const settling = useSharedValue(0);
  const rowCount = useSharedValue(count);
  const lastSlot = useSharedValue(IDLE);

  useEffect(() => {
    rowCount.value = count;
  }, [count, rowCount]);

  // Held in a ref so the context value stays stable: the callbacks close over
  // the live exercise order, which changes on every write.
  const callbacks = useRef({ onReorder, onReorderingChange });
  useEffect(() => {
    callbacks.current = { onReorder, onReorderingChange };
  });

  const value = useMemo<ReorderContextValue>(() => {
    /** Called from JS beside the state update that re-renders the list. */
    const settle = () => {
      settling.value = 1;
      fromIndex.value = IDLE;
      dropIndex.value = IDLE;
      translateY.value = 0;
      draggingId.value = '';
      ready.value = 0;
      progress.value = withTiming(0, { duration: COLLAPSE });
    };

    return {
      progress,
      draggingId,
      fromIndex,
      dropIndex,
      translateY,
      settling,

      beginDrag: (id, index) => {
        'worklet';
        draggingId.value = id;
        fromIndex.value = index;
        dropIndex.value = IDLE;
        lastSlot.value = index;
        translateY.value = 0;
        settling.value = 0;
        ready.value = 0;
        progress.value = withTiming(1, { duration: COLLAPSE }, (finished) => {
          if (finished) ready.value = 1;
        });
        runOnJS(liftHaptic)();
      },

      /**
       * The slot is left alone until the fold finishes: it is measured in
       * collapsed pitch, which the half-folded list does not yet have.
       */
      moveDrag: (translationY) => {
        'worklet';
        translateY.value = translationY;
        if (ready.value === 0) return;

        const raw = Math.round((fromIndex.value * PITCH + translationY) / PITCH);
        const slot = Math.min(Math.max(raw, 0), rowCount.value - 1);
        if (slot !== lastSlot.value) {
          lastSlot.value = slot;
          runOnJS(tickHaptic)();
        }
        dropIndex.value = slot;
      },

      /**
       * A committed release leaves every offset exactly as it is: the rows stay
       * where the finger left them until `settle` clears them, which the handler
       * does in the same tick it re-renders the list.
       *
       * Clearing here instead would run on the UI thread the moment the finger
       * lifts, while the re-render only arrives later over `runOnJS` — and in
       * between, every row sits at its old slot with no offset, which reads as
       * the target slot flashing its previous occupant.
       */
      endDrag: (committed) => {
        'worklet';
        if (committed) return;

        fromIndex.value = IDLE;
        dropIndex.value = IDLE;
        ready.value = 0;
        progress.value = withTiming(0, { duration: COLLAPSE });
        translateY.value = withTiming(0, { duration: SNAP_BACK }, (finished) => {
          if (finished) draggingId.value = '';
        });
      },

      reorder: (from, to) => callbacks.current.onReorder(from, to, settle),
      setReordering: (reordering) => callbacks.current.onReorderingChange(reordering),
    };
    // Shared values are stable for the provider's lifetime. Listing them would
    // make the compiler treat them as hook arguments and reject the writes
    // above, so the two rules can't both be satisfied here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ReorderContext value={value}>{children}</ReorderContext>;
}

/**
 * Where a row sits while a drag is in flight: the lifted one follows the
 * finger, the ones it has displaced slide one slot along.
 */
export function useRowMotion(id: string, index: number) {
  const { draggingId, fromIndex, dropIndex, translateY, settling } = useExerciseReorder();

  return useAnimatedStyle(() => {
    if (draggingId.value === id) {
      // Settling means the list has re-rendered with this row already in its
      // new slot, so the lift has to be off before the next frame paints it.
      const landing = settling.value === 1;
      return {
        transform: [
          { translateY: translateY.value },
          { scale: withTiming(landing ? 1 : 1.03, { duration: 140 }) },
        ],
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
    // so the offsets are already zero. Animating to zero from here would slide
    // each row a slot further than it should go.
    if (settling.value === 1) {
      return { transform: [{ translateY: shiftY }, { scale: 1 }], zIndex: 0 };
    }

    return {
      transform: [
        { translateY: withTiming(shiftY, { duration: SHIFT }) },
        { scale: withTiming(1, { duration: 140 }) },
      ],
      zIndex: 0,
    };
  });
}

/**
 * Lives apart from `useRowMotion` because the shadow belongs on the name chip —
 * the only part of a row with a background to cast one — while the transform
 * belongs on the row as a whole.
 */
export function useLiftShadow(id: string) {
  const { draggingId, settling } = useExerciseReorder();

  return useAnimatedStyle(() => {
    const lifted = draggingId.value === id && settling.value === 0;
    return { shadowOpacity: withTiming(lifted ? 0.18 : 0, { duration: 140 }) };
  });
}

/** 0 while the sets are showing, 1 once every row has folded to its name. */
export function useCollapseProgress(): SharedValue<number> {
  return useExerciseReorder().progress;
}

/** Everything that isn't an exercise recedes while the list is folded. */
export function ReorderDim({ children }: { children: React.ReactNode }) {
  const progress = useCollapseProgress();
  const dim = useAnimatedStyle(() => ({ opacity: 1 - progress.value * 0.7 }));

  return <Animated.View style={dim}>{children}</Animated.View>;
}

function liftHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function tickHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
