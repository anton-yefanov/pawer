import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AreaChart } from "@/components/analytics/area-chart";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useEasedProgress } from "@/hooks/use-eased-progress";
import { useTheme } from "@/hooks/use-theme";
import { periodLabel, type PeriodId } from "@/lib/analytics-period";
import {
  formatBucketRange,
  trendSeries,
  type Series,
} from "@/lib/analytics-series";
import * as haptics from "@/lib/haptics";

export function MetricChart({
  title,
  series,
  total,
  format,
  period,
}: {
  title: string;
  series: Series;
  total: number;
  format: (value: number) => string;
  period: PeriodId;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const [trend, setTrend] = useState(false);

  const trended = useMemo(() => trendSeries(series), [series]);
  const progress = useEasedProgress(trend);

  // Interpolated point by point rather than cross-faded: the two series share
  // their buckets, so the line can walk from one shape to the other and the
  // y-axis rescales with it.
  const shown = useMemo(() => {
    if (progress === 0) return series;
    if (progress === 1) return trended;
    return {
      ...series,
      points: series.points.map((point, index) => ({
        ...point,
        value:
          point.value + (trended.points[index].value - point.value) * progress,
      })),
    };
  }, [series, trended, progress]);

  const point = selected === null ? undefined : shown.points[selected];
  const empty = shown.points.length === 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.backgroundElement,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="headline" numberOfLines={1} style={styles.title}>
          {title} ({series.label})
        </ThemedText>
        {!empty && (
          <Pressable
            onPress={() => {
              haptics.select();
              setTrend(!trend);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: trend
                  ? theme.backgroundSelected
                  : theme.backgroundElement,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <ThemedText
              type="footnote"
              themeColor={trend ? "text" : "textSecondary"}
            >
              Trend
            </ThemedText>
          </Pressable>
        )}
      </View>

      {!empty ? (
        <>
          <View style={styles.readout}>
            <ThemedText type="title1" numeric>
              {format(point ? point.value : total)}
            </ThemedText>
            <ThemedText type="footnote" themeColor="textSecondary">
              {point
                ? formatBucketRange(point, shown.bucket)
                : periodLabel(period)}
            </ThemedText>
          </View>

          <AreaChart
            points={shown.points}
            bucket={shown.bucket}
            selected={selected}
            onSelect={setSelected}
            formatValue={format}
          />
        </>
      ) : (
        <ThemedText
          type="footnote"
          themeColor="textSecondary"
          style={styles.empty}
        >
          No finished workouts in this period.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  chip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  readout: {
    gap: Spacing.half,
  },
  empty: {
    paddingBottom: Spacing.one,
  },
});
