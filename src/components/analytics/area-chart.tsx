import { useState } from "react";
import { View } from "react-native";
import { AreaChart as ChartKitAreaChart } from "react-native-chart-kit/v2";

import {
  AXIS_GUTTER,
  chartRenderer,
} from "@/components/analytics/chart-renderer";
import { ChartTip } from "@/components/analytics/chart-tip";
import { CHART_LABEL_SIZE } from "@/components/analytics/chart-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { press, select } from "@/lib/haptics";
import {
  formatBucketRange,
  type Bucket,
  type SeriesPoint,
} from "@/lib/analytics-series";

const HEIGHT = 180;

// The kit pads the plot by 10pt, then the label width, then an 8pt gap, and
// right-aligns the labels against that gap. The plot starts at `AXIS_GUTTER`
// on every chart, whatever its labels say.
const Y_LABEL_WIDTH = AXIS_GUTTER - 18;

const renderer = chartRenderer({ clipLines: true });

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
  tip = false,
  formatAxis,
}: {
  points: readonly SeriesPoint[];
  bucket: Bucket;
  selected: number | null;
  onSelect: (index: number | null) => void;
  formatValue: (value: number) => string;
  muted?: boolean;
  smooth?: boolean;
  labels?: boolean;
  /** Float the selected value over the plot, for callers with no readout of their own. */
  tip?: boolean;
  /** A terser `formatValue` for the y-axis ticks. */
  formatAxis?: (value: number) => string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [tipX, setTipX] = useState(0);

  const axisFormat = labels ? (formatAxis ?? formatValue) : () => "";

  const color = muted ? theme.accentMuted : theme.accent;
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
          yAxisLabelWidth={Y_LABEL_WIDTH}
          renderer={renderer}
          showDots={false}
          activeDot={{
            visible: true,
            shape: "circle",
            radius: 5,
            fill: "series",
            // The theme's background is transparent here, so the ring that
            // lifts the dot off the line is the card's own colour.
            stroke: theme.surface,
            strokeWidth: 2,
          }}
          // Never `undefined`: that flips the kit to uncontrolled, where it keeps
          // its own copy of the first touch and shows it again once we clear.
          selectedIndex={selected ?? -1}
          interaction={
            muted
              ? "none"
              : {
                  mode: "scrub",
                  selectionPersistence: "whileActive",
                  onSelect: (event) => {
                    if (event.index === selected) return;
                    if (selected === null) press();
                    else select();
                    setTipX(event.position.x);
                    onSelect(event.index);
                  },
                  onDeselect: () => onSelect(null),
                }
          }
          tooltip={false}
          crosshair={false}
          legend={false}
          showHorizontalGridLines
          showVerticalGridLines={false}
          formatYLabel={axisFormat}
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
            typography: {
              axisLabelSize: CHART_LABEL_SIZE,
              legendLabelSize: CHART_LABEL_SIZE,
            },
          }}
        />
      )}
      {tip && !muted && selected !== null && points[selected] && (
        // Pinned over the top of the plot, where the finger scrubbing below
        // can never cover it.
        <ChartTip
          bounds={width}
          place={(tip) => ({
            top: -tip.height + Spacing.one,
            left: tipX - tip.width / 2,
          })}
          label={formatBucketRange(points[selected], bucket)}
          value={formatValue(points[selected].value)}
        />
      )}
    </View>
  );
}
