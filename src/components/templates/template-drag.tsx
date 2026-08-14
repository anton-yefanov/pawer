import { createContext, useContext, useEffect, useMemo, useRef, type RefObject } from 'react';
import { type View } from 'react-native';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import * as haptics from '@/lib/haptics';

/**
 * Drag a template onto a folder to file it, or past its neighbours to reorder.
 *
 * The lifted card is not copied into an overlay — it stays in the grid and
 * moves by the gesture's *translation*, so it tracks the finger without any
 * screen-offset arithmetic. Everything else follows from the grid being a
 * uniform lattice: an index maps to a slot by arithmetic, so the drop index is
 * read straight off the finger position and the displaced neighbours slide to
 * the slot their new index implies.
 *
 * One flat index space holds both kinds, folders first. A drag is clamped to
 * its own kind's span, which is what keeps folders pinned above the templates
 * and the two from interleaving.
 *
 * Cards read the shared values but never write them: every write is a worklet
 * declared here, beside the `useSharedValue` that owns it.
 */

const SNAP_BACK = 160;
const SHIFT = 180;
const IDLE = -1;

export type DragKind = 'folder' | 'template';

type Frame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Grid = {
  /** Window coordinates of the grid's top-left corner. */
  x: number;
  y: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  columns: number;
  folderCount: number;
  itemCount: number;
};

const NO_GRID: Grid = {
  x: 0,
  y: 0,
  cellWidth: 0,
  cellHeight: 0,
  gap: 0,
  columns: 1,
  folderCount: 0,
  itemCount: 0,
};

export type GridMeta = Omit<Grid, 'x' | 'y'>;

type DragContextValue = {
  registerFolder: (id: string, ref: RefObject<View | null>) => () => void;
  registerGrid: (ref: RefObject<View | null>, meta: GridMeta) => void;
  captureLayout: () => void;
  hoveredFolderId: SharedValue<string>;
  draggingId: SharedValue<string>;
  fromIndex: SharedValue<number>;
  dropIndex: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  settling: SharedValue<number>;
  grid: SharedValue<Grid>;
  beginDrag: (templateId: string, index: number) => void;
  moveDrag: (x: number, y: number, absoluteX: number, absoluteY: number, kind: DragKind) => void;
  endDrag: (committed: boolean) => void;
  settle: () => void;
  drop: (templateId: string, folderId: string) => void;
  reorder: (kind: DragKind, from: number, to: number) => void;
  setDragging: (dragging: boolean) => void;
};

/** Clears the drag offsets. Call it in the same tick as the state update. */
export type Settle = () => void;

const DragContext = createContext<DragContextValue | null>(null);

export function useTemplateDrag(): DragContextValue {
  const value = useContext(DragContext);
  if (!value) throw new Error('useTemplateDrag outside TemplateDragProvider');
  return value;
}

/** Renders no view of its own, so it can wrap a ScrollView without changing layout. */
export function TemplateDragProvider({
  onDrop,
  onReorder,
  onDraggingChange,
  children,
}: {
  onDrop: (templateId: string, folderId: string, settle: Settle) => void;
  onReorder: (kind: DragKind, from: number, to: number, settle: Settle) => void;
  onDraggingChange: (dragging: boolean) => void;
  children: React.ReactNode;
}) {
  const folders = useRef(new Map<string, RefObject<View | null>>()).current;
  const gridRef = useRef<{
    ref: RefObject<View | null>;
    meta: GridMeta;
  } | null>(null);

  const frames = useSharedValue<Frame[]>([]);
  const grid = useSharedValue<Grid>(NO_GRID);
  const hoveredFolderId = useSharedValue('');
  const draggingId = useSharedValue('');
  const fromIndex = useSharedValue(IDLE);
  const dropIndex = useSharedValue(IDLE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const settling = useSharedValue(0);
  // Mirrors exercise-reorder: the tick only fires when the target actually
  // changes, not on every frame of the pan.
  const lastSlot = useSharedValue(IDLE);
  const lastFolder = useSharedValue('');

  // Held in a ref so the context value stays stable: the callbacks close over
  // the live template order, which changes on every write.
  const callbacks = useRef({ onDrop, onReorder, onDraggingChange });
  useEffect(() => {
    callbacks.current = { onDrop, onReorder, onDraggingChange };
  });

  const value = useMemo<DragContextValue>(() => {
    /** Called from JS beside the state update that re-renders the grid. */
    const settle = () => {
      settling.value = 1;
      fromIndex.value = IDLE;
      dropIndex.value = IDLE;
      translateX.value = 0;
      translateY.value = 0;
      draggingId.value = '';
    };

    return {
      hoveredFolderId,
      draggingId,
      fromIndex,
      dropIndex,
      translateX,
      translateY,
      settling,
      grid,
      settle,

      registerFolder: (id, ref) => {
        folders.set(id, ref);
        return () => {
          folders.delete(id);
        };
      },
      registerGrid: (ref, meta) => {
        gridRef.current = { ref, meta };
      },

      captureLayout: () => {
        const registered = gridRef.current;
        registered?.ref.current?.measureInWindow((x, y) => {
          grid.value = { ...registered.meta, x, y };
        });

        const measured: Frame[] = [];
        let pending = folders.size;
        if (pending === 0) {
          frames.value = [];
          return;
        }
        const settle = () => {
          pending -= 1;
          if (pending === 0) frames.value = measured;
        };
        folders.forEach((ref, id) => {
          const node = ref.current;
          if (!node) {
            settle();
            return;
          }
          node.measureInWindow((x, y, width, height) => {
            measured.push({ id, x, y, width, height });
            settle();
          });
        });
      },

      beginDrag: (templateId, index) => {
        'worklet';
        draggingId.value = templateId;
        fromIndex.value = index;
        dropIndex.value = IDLE;
        translateX.value = 0;
        translateY.value = 0;
        settling.value = 0;
        lastSlot.value = index;
        lastFolder.value = '';
        runOnJS(haptics.press)();
      },

      moveDrag: (x, y, absoluteX, absoluteY, kind) => {
        'worklet';
        translateX.value = x;
        translateY.value = y;

        // Filing into a folder wins over reordering: a template held over a
        // folder is going in, not going next to it.
        const overFolder = kind === 'template' ? frameAt(frames.value, absoluteX, absoluteY) : '';
        hoveredFolderId.value = overFolder;
        const slot = overFolder === '' ? slotAt(grid.value, absoluteX, absoluteY, kind) : IDLE;

        // Crossing into a folder is its own event, so it ticks even though the
        // slot went idle in the same move.
        if (overFolder !== lastFolder.value) {
          lastFolder.value = overFolder;
          if (overFolder !== '') runOnJS(haptics.tap)();
        } else if (slot !== lastSlot.value) {
          runOnJS(haptics.tap)();
        }
        lastSlot.value = slot;

        dropIndex.value = slot;
      },

      /**
       * A committed release leaves every offset exactly as it is: the cards
       * stay where the finger left them until `settle` clears them, which the
       * handler does in the same tick it re-renders the grid.
       *
       * Clearing here instead would run on the UI thread the moment the finger
       * lifts, while the re-render only arrives later over `runOnJS` — and in
       * between, every card sits at its old slot with no offset, which reads as
       * the target slot flashing its previous occupant.
       */
      endDrag: (committed: boolean) => {
        'worklet';
        hoveredFolderId.value = '';
        if (committed) return;

        fromIndex.value = IDLE;
        dropIndex.value = IDLE;
        translateX.value = withTiming(0, { duration: SNAP_BACK });
        translateY.value = withTiming(0, { duration: SNAP_BACK }, (finished) => {
          if (finished) draggingId.value = '';
        });
      },

      drop: (templateId, folderId) => {
        haptics.complete();
        callbacks.current.onDrop(templateId, folderId, settle);
      },
      reorder: (kind, from, to) => {
        haptics.complete();
        callbacks.current.onReorder(kind, from, to, settle);
      },
      setDragging: (dragging) => callbacks.current.onDraggingChange(dragging),
    };
    // Shared values and the two registries are stable for the provider's
    // lifetime. Listing them would make the compiler treat them as hook
    // arguments and reject the writes above, so the two rules can't both be
    // satisfied here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <DragContext value={value}>{children}</DragContext>;
}

/**
 * Where a cell sits while a drag is in flight: the dragged one follows the
 * finger, the ones it has displaced slide one slot along.
 */
export function useCellMotion(id: string, index: number) {
  const drag = useTemplateDrag();

  return useAnimatedStyle(() => {
    const lifted = drag.draggingId.value === id;
    if (lifted) {
      return {
        transform: [
          { translateX: drag.translateX.value },
          { translateY: drag.translateY.value },
          { scale: withTiming(1.04, { duration: 120 }) },
        ],
        zIndex: 2,
        shadowOpacity: withTiming(0.25, { duration: 120 }),
      };
    }

    const from = drag.fromIndex.value;
    const to = drag.dropIndex.value;
    let displaced = index;
    if (from !== IDLE && to !== IDLE && from !== to) {
      if (from < to && index > from && index <= to) displaced = index - 1;
      else if (to < from && index >= to && index < from) displaced = index + 1;
    }

    const { cellWidth, cellHeight, gap, columns } = drag.grid.value;
    const shiftX = ((displaced % columns) - (index % columns)) * (cellWidth + gap);
    const shiftY =
      (Math.floor(displaced / columns) - Math.floor(index / columns)) * (cellHeight + gap);

    // Settling: the grid has just re-rendered with everyone in their new slot,
    // so the offsets are already zero. Animating to zero from here would slide
    // each card a slot further than it should go.
    if (drag.settling.value === 1) {
      return {
        transform: [{ translateX: shiftX }, { translateY: shiftY }, { scale: 1 }],
        zIndex: 0,
        shadowOpacity: 0,
      };
    }

    return {
      transform: [
        { translateX: withTiming(shiftX, { duration: SHIFT }) },
        { translateY: withTiming(shiftY, { duration: SHIFT }) },
        { scale: withTiming(1, { duration: 120 }) },
      ],
      zIndex: 0,
      shadowOpacity: withTiming(0, { duration: 120 }),
    };
  });
}

/**
 * The slot under a point, clamped to the span the dragged kind may occupy —
 * which is what pins folders above templates.
 *
 * The clamping is written out rather than factored into a helper: Reanimated
 * captures a module-scope worklet referenced from a worklet, but not one
 * referenced from *that* worklet in turn, and it fails at run time.
 */
function slotAt(grid: Grid, x: number, y: number, kind: DragKind): number {
  'worklet';
  if (grid.itemCount === 0 || grid.cellHeight === 0) return IDLE;

  const rawColumn = Math.floor((x - grid.x) / (grid.cellWidth + grid.gap));
  const column = Math.min(Math.max(rawColumn, 0), grid.columns - 1);
  const row = Math.max(0, Math.floor((y - grid.y) / (grid.cellHeight + grid.gap)));
  const index = row * grid.columns + column;

  const low = kind === 'folder' ? 0 : grid.folderCount;
  const high = kind === 'folder' ? grid.folderCount - 1 : grid.itemCount - 1;
  if (high < low) return IDLE;
  return Math.min(Math.max(index, low), high);
}

function frameAt(frames: Frame[], x: number, y: number): string {
  'worklet';
  for (const frame of frames) {
    if (x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height) {
      return frame.id;
    }
  }
  return '';
}
