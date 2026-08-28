import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AreaChart } from "@/components/analytics/area-chart";
import { ExerciseSection } from "@/components/exercises/exercise-section";
import { Icon } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ExerciseSession } from "@/lib/exercise-history-queries";
import { metricsFor } from "@/lib/exercise-metrics";
import * as haptics from "@/lib/haptics";
import { presentPaywall } from "@/lib/paywall";
import { usePro } from "@/lib/purchases";
import { formatBucketRange, type Series } from "@/lib/analytics-series";
import type { TrackingType } from "@/lib/tracking-types";
import type { WeightUnit } from "@/lib/units";

/** Past this the bars are thinner than the gaps between them. */
const VISIBLE_SESSIONS = 30;

/**
 * The shape shown wherever real progress isn't: nothing logged yet, or logged
 * but locked. It is decorative — drawn without axis labels so no one reads a
 * number off it — and only its rise and fall have to look like training.
 */
const PLACEHOLDER_POINTS = [2, 3.4, 2.6, 3.1, 4.4, 3.6, 4, 5.4].map(
  (value, index) => ({
    start: index,
    end: index + 1,
    value,
  }),
);

export function ExerciseProgress({
  sessions,
  trackingType,
  unit,
}: {
  sessions: readonly ExerciseSession[];
  trackingType: TrackingType;
  unit: WeightUnit;
}) {
  const theme = useTheme();
  const isPro = usePro();
  const metrics = metricsFor(trackingType);
  const [metricId, setMetricId] = useState(metrics[0].id);
  const [selected, setSelected] = useState<number | null>(null);

  const metric = metrics.find((entry) => entry.id === metricId) ?? metrics[0];

  /**
   * One bar per session rather than per calendar bucket: an exercise trained
   * weekly would otherwise spend most of the axis on empty days. `bucket: 'day'`
   * is what makes `formatBucketRange` date a point, and the one-ms span keeps
   * `SeriesPoint` honest about covering a single instant.
   */
  const logged = sessions.slice(-VISIBLE_SESSIONS).map((session) => ({
    start: session.startedAt,
    end: session.startedAt + 1,
    value: metric.pick(session),
  }));
  const empty = logged.length === 0;
  const real = isPro && !empty;

  const series: Series = {
    bucket: "day",
    label: "Per session",
    points: real ? logged : PLACEHOLDER_POINTS,
  };

  const last = series.points[series.points.length - 1];
  const point = (selected === null ? last : series.points[selected]) ?? last;
  const best = Math.max(...logged.map((entry) => entry.value));

  const chart = {
    points: series.points,
    bucket: series.bucket,
    formatValue: (value: number) => metric.format(value, unit),
  };

  return (
    <ExerciseSection
      title="Progress"
      trailing={
        metrics.length > 1 && isPro && !empty ? (
          <View style={styles.chips}>
            {metrics.map((entry) => {
              const active = entry.id === metric.id;
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => {
                    if (active) return;
                    haptics.select();
                    setSelected(null);
                    setMetricId(entry.id);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    themeColor={active ? "text" : "textSecondary"}
                  >
                    {entry.short}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : null
      }
    >
      <View style={styles.readout}>
        {/* No placeholder value with nothing logged: a lone dash where the big
            number goes reads as a broken readout rather than an empty one. */}
        {!empty && (
          <ThemedText type="subtitle" style={styles.value}>
            {metric.format(isPro ? point.value : best, unit)}
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {empty
            ? `${metric.title} · no sessions yet`
            : isPro
              ? `${metric.title} · ${formatBucketRange(point, "day")}`
              : `${metric.title} · best`}
        </ThemedText>
      </View>

      {real ? (
        <AreaChart {...chart} selected={selected} onSelect={setSelected} />
      ) : (
        <View>
          <View pointerEvents="none">
            <AreaChart
              {...chart}
              selected={null}
              onSelect={() => {}}
              muted
              smooth
              labels={false}
            />
          </View>
          {isPro ? null : (
            <Pressable
              onPress={() => {
                haptics.tap();
                void presentPaywall('exercise_progress');
              }}
              style={({ pressed }) => [
                styles.lock,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.lockPill,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <Icon name="lock.fill" size={14} tintColor={theme.accent} />
                <ThemedText type="smallBold" themeColor="accent">
                  Unlock progress charts
                </ThemedText>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </ExerciseSection>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  chip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  readout: {
    gap: Spacing.half,
  },
  value: {
    fontVariant: ["tabular-nums"],
  },
  lock: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
});
