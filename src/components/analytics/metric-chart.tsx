import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AnalyticsBlock,
  BLOCK_BODY_HEIGHT,
  useBlockPeriod,
  type BlockSlot,
} from "@/components/analytics/analytics-block";
import { AreaChart } from "@/components/analytics/area-chart";
import {
  CardPlaceholder,
  placeholderSeries,
} from "@/components/analytics/placeholder";
import { Spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { metricSeriesQuery, type MetricRow } from "@/lib/analytics-queries";
import { buildSeries } from "@/lib/analytics-series";
import { useIncludeWarmup } from "@/lib/warmup-stats";

export function MetricChart({
  slot,
  title,
  pick,
  format,
  formatAxis,
  placeholder,
}: {
  slot: BlockSlot;
  title: string;
  pick: (row: MetricRow) => number;
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** A week of believable values, in this metric's own unit, for the empty card. */
  placeholder: readonly number[];
}) {
  const { period, range, select } = useBlockPeriod();
  const includeWarmup = useIncludeWarmup();
  const [selected, setSelected] = useState<number | null>(null);

  const { data: rows } = useLiveQuery(metricSeriesQuery(range, includeWarmup), [
    range,
    includeWarmup,
  ]);
  const series = useMemo(
    () => buildSeries(rows ?? [], range, pick),
    [rows, range, pick],
  );
  const total = series.points.reduce((sum, point) => sum + point.value, 0);
  const empty = series.points.length === 0;
  const preview = useMemo(() => placeholderSeries(placeholder), [placeholder]);

  return (
    <AnalyticsBlock
      slot={slot}
      title={title}
      subtitle={
        empty ? t("analytics:noWorkouts") : t("analytics:total", { value: format(total) })
      }
      period={period}
      onPeriodChange={(next) => {
        setSelected(null);
        select(next);
      }}
    >
      {!empty ? (
        <View style={styles.body}>
          <AreaChart
            points={series.points}
            bucket={series.bucket}
            selected={selected}
            onSelect={setSelected}
            formatValue={format}
            formatAxis={formatAxis}
            height={BLOCK_BODY_HEIGHT}
            tip
          />
        </View>
      ) : (
        <CardPlaceholder text={t("analytics:locked")}>
          <View style={styles.body}>
            <AreaChart
              points={preview}
              bucket="day"
              selected={null}
              onSelect={() => {}}
              formatValue={format}
              formatAxis={formatAxis}
              height={BLOCK_BODY_HEIGHT}
              muted
            />
          </View>
        </CardPlaceholder>
      )}
    </AnalyticsBlock>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
});
