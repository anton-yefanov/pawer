import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, type AnimatedStyle } from 'react-native-reanimated';

import { cardSlot, LIFT_DELAY } from '@/components/templates/grid-card';
import {
  useCellMotion,
  useTemplateDrag,
  type DragKind,
} from '@/components/templates/template-drag';
import { useTheme } from '@/hooks/use-theme';


export function DraggableCell({
  id,
  index,
  kind,
  width,
  highlight,
  children,
}: {
  id: string;
  index: number;
  kind: DragKind;
  width: number;
  /** Merged last, so a folder can paint the reserved border while receiving. */
  highlight?: StyleProp<AnimatedStyle<ViewStyle>>;
  children: React.ReactNode;
}) {
  const drag = useTemplateDrag();
  const motion = useCellMotion(id, index);
  const theme = useTheme();

  // Carries the outcome from onEnd to onFinalize, which always runs.
  const committed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(LIFT_DELAY)
    .onStart((event) => {
      // Translation counts from touch-down, and the finger may have crept
      // during the long press, so subtract it to recover the original point.
      drag.beginDrag(id, index, event.x - event.translationX, event.y - event.translationY);
      runOnJS(drag.setDragging)(true);
    })
    .onUpdate((event) => {
      drag.moveDrag(event.translationX, event.translationY, kind);
    })
    .onEnd(() => {
      const folderId = drag.hoveredFolderId.value;
      const to = drag.dropIndex.value;
      if (folderId !== '') {
        runOnJS(drag.drop)(kind, id, folderId);
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
      <Animated.View
        style={[
          cardSlot,
          styles.lift,
          { width, shadowColor: theme.shadow },
          motion,
          highlight,
        ]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  lift: {
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
