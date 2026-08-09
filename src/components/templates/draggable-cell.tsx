import { StyleSheet, type StyleProp, type View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, type AnimatedStyle } from 'react-native-reanimated';

import { cardSlot } from '@/components/templates/grid-card';
import {
  useCellMotion,
  useTemplateDrag,
  type DragKind,
} from '@/components/templates/template-drag';

/** Long enough that a tap opens the card and a scroll flick doesn't lift it. */
const LIFT_DELAY = 250;

export function DraggableCell({
  id,
  index,
  kind,
  width,
  cellRef,
  highlight,
  children,
}: {
  id: string;
  index: number;
  kind: DragKind;
  width: number;
  /** Folders hand this in so the drop test can measure the slot. */
  cellRef?: React.RefObject<View | null>;
  /** Merged last, so a folder can paint the reserved border while receiving. */
  highlight?: StyleProp<AnimatedStyle<ViewStyle>>;
  children: React.ReactNode;
}) {
  const drag = useTemplateDrag();
  const motion = useCellMotion(id, index);

  // Carries the outcome from onEnd to onFinalize, which always runs.
  const committed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LIFT_DELAY)
    .onBegin(() => {
      runOnJS(drag.captureLayout)();
    })
    .onStart(() => {
      drag.beginDrag(id, index);
      runOnJS(drag.setDragging)(true);
    })
    .onUpdate((event) => {
      drag.moveDrag(event.translationX, event.translationY, event.absoluteX, event.absoluteY, kind);
    })
    .onEnd(() => {
      const folderId = drag.hoveredFolderId.value;
      const to = drag.dropIndex.value;
      if (kind === 'template' && folderId !== '') {
        runOnJS(drag.drop)(id, folderId);
        committed.value = true;
      } else if (to >= 0 && to !== index) {
        runOnJS(drag.reorder)(kind, index, to);
        committed.value = true;
      }
    })
    .onFinalize(() => {
      drag.endDrag(committed.value);
      committed.value = false;
      runOnJS(drag.setDragging)(false);
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View ref={cellRef} style={[cardSlot, styles.lift, { width }, motion, highlight]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  lift: {
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
