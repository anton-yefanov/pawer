import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Line, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { SeriesPoint } from '@/lib/analytics-series';

const HEIGHT = 150;
const GAP = 2;
const EMPTY_STUB = 2;

export function BarChart({
  points,
  selected,
  onSelect,
}: {
  points: readonly SeriesPoint[];
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const slot = width / points.length;
  const barWidth = Math.max(slot - GAP, 1);
  const max = Math.max(...points.map((point) => point.value), 0);

  const pick = (x: number) => {
    const index = Math.floor(x / slot);
    onSelect(Math.min(Math.max(index, 0), points.length - 1));
  };

  const scrub = Gesture.Race(
    Gesture.Tap()
      .runOnJS(true)
      .onBegin((event) => pick(event.x))
      .onFinalize(() => onSelect(null)),
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((event) => pick(event.x))
      .onUpdate((event) => pick(event.x))
      .onFinalize(() => onSelect(null))
  );

  return (
    <GestureDetector gesture={scrub}>
      <View
        style={styles.plot}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {points.map((point, index) => {
              const empty = point.value === 0;
              const height = empty || max === 0 ? EMPTY_STUB : (point.value / max) * HEIGHT;
              const muted = empty || (selected !== null && selected !== index);

              return (
                <Rect
                  key={point.start}
                  x={index * slot + GAP / 2}
                  y={HEIGHT - height}
                  width={barWidth}
                  height={height}
                  rx={Math.min(barWidth / 2, 3)}
                  fill={muted ? theme.backgroundSelected : theme.accent}
                />
              );
            })}
            <Line
              x1={0}
              y1={HEIGHT}
              x2={width}
              y2={HEIGHT}
              stroke={theme.backgroundSelected}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          </Svg>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: HEIGHT,
    justifyContent: 'flex-end',
  },
});
