import { useState } from "react";
import { View } from "react-native";
import { AreaChart as ChartKitAreaChart } from "react-native-chart-kit/v2";

import { useTheme } from "@/hooks/use-theme";
import {
  formatBucketRange,
  type Bucket,
  type SeriesPoint,
} from "@/lib/analytics-series";

const HEIGHT = 180;

const SMOOTH_STEPS = 12;

/**
 * Catmull-Rom overshoots at the turns, which is the whole point: the locked
 * preview reads as a curve rather than as data, and `monotone` — the curviest
 * the chart itself offers — can't overshoot by construction.
 */
function smoothed(values: readonly number[]) {
  if (values.length < 3) return values.map((y, x) => ({ x, y }));

  const at = (index: number) =>
    values[Math.min(values.length - 1, Math.max(0, index))];
  const out: { x: number; y: number }[] = [];

  for (let index = 0; index < values.length - 1; index += 1) {
    const [p0, p1, p2, p3] = [
      at(index - 1),
      at(index),
      at(index + 1),
      at(index + 2),
    ];
    for (let step = 0; step < SMOOTH_STEPS; step += 1) {
      const t = step / SMOOTH_STEPS;
      out.push({
        x: index + t,
        y:
          0.5 *
          (2 * p1 +
            (p2 - p0) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t),
      });
    }
  }
  out.push({ x: values.length - 1, y: values[values.length - 1] });
  return out;
}

export function AreaChart({
  points,
  bucket,
  selected,
  onSelect,
  formatValue,
  muted = false,
  smooth = false,
  labels = true,
}: {
  points: readonly SeriesPoint[];
  bucket: Bucket;
  selected: number | null;
  onSelect: (index: number | null) => void;
  formatValue: (value: number) => string;
  muted?: boolean;
  smooth?: boolean;
  labels?: boolean;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const color = muted ? theme.backgroundSelected : theme.accent;
  const data = smooth
    ? smoothed(points.map((point) => point.value))
    : points.map((point, index) => ({ x: index, y: point.value }));

  return (
    <View
      style={{ height: HEIGHT }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <ChartKitAreaChart
          data={data}
          xKey="x"
          yKey="y"
          width={width}
          height={HEIGHT}
          curve="monotone"
          areaFill={{
            fromColor: color,
            toColor: color,
            fromOpacity: 0.28,
            toOpacity: 0,
          }}
          yDomain={{ min: 0, max: "dataMax", nice: true }}
          yAxisLabelWidth="stable"
          showDots={false}
          activeDot={{
            visible: true,
            shape: "circle",
            radius: 4,
            fill: "background",
            stroke: "series",
            strokeWidth: 2,
          }}
          selectedIndex={selected ?? undefined}
          interaction={
            muted
              ? "none"
              : {
                  mode: "scrub",
                  selectionPersistence: "whileActive",
                  onSelect: (event) => onSelect(event.index),
                  onDeselect: () => onSelect(null),
                }
          }
          tooltip={false}
          crosshair={false}
          legend={false}
          showHorizontalGridLines
          showVerticalGridLines={false}
          formatYLabel={labels ? formatValue : () => ""}
          formatXLabel={
            labels
              ? (_, index) =>
                  formatBucketRange(
                    points[Math.round(data[index]?.x ?? index)],
                    bucket,
                  )
              : () => ""
          }
          theme={{
            background: "transparent",
            plotBackground: "transparent",
            grid: theme.backgroundElement,
            axis: theme.backgroundSelected,
            text: theme.textSecondary,
            mutedText: theme.textSecondary,
            series: [color],
          }}
        />
      )}
    </View>
  );
}
