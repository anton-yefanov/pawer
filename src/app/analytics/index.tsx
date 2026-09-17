import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import type { BlockSlot } from "@/components/analytics/analytics-block";
import { MetricChart } from "@/components/analytics/metric-chart";
import { RecordsCard } from "@/components/analytics/records-card";
import { SummaryBlock } from "@/components/analytics/summary-block";
import {
  ExerciseReorderProvider,
  type Settle,
} from "@/components/workout/exercise-reorder";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useBlockLayout, type BlockId } from "@/lib/analytics-layout";
import type { MetricRow } from "@/lib/analytics-queries";
import * as haptics from "@/lib/haptics";
import { move } from "@/lib/order";
import { formatTonnage } from "@/lib/units";
import { useWeightUnit } from "@/lib/weight-unit";
import { formatHoursMinutes } from "@/lib/workout-stats";

const MINUTE = 60_000;

/** A believable training week, drawn dimmed behind the lock on an empty card. */
const PLACEHOLDER_TONNAGE_KG = [4200, 5100, 3800, 6200, 5400, 7000, 6100, 7600];
const PLACEHOLDER_DURATION_MS = [45, 62, 51, 70, 58, 74, 63, 81].map(
  (minutes) => minutes * MINUTE,
);

// Module-level so the chart's series memo isn't rebuilt every render.
const pickVolume = (row: MetricRow) => row.volumeKg;
const pickDuration = (row: MetricRow) => row.durationMs;

export default function AnalyticsScreen() {
  const theme = useTheme();
  const unit = useWeightUnit();
  const layout = useBlockLayout();
  const { blocks } = layout;
  const [reordering, setReordering] = useState(false);

  const reorder = (from: number, to: number, settle: Settle) => {
    void layout.reorder(move(blocks, from, to));
    settle();
    haptics.complete();
  };

  const slotFor = (id: BlockId, index: number): BlockSlot => ({
    id,
    index,
    count: blocks.length,
    moveTo: (to) => void layout.reorder(move(blocks, index, to)),
    remove: () => {
      haptics.warn();
      void layout.remove(id);
    },
  });

  const render = (slot: BlockSlot) => {
    switch (slot.id) {
      case "summary":
        return <SummaryBlock key={slot.id} slot={slot} />;
      case "records":
        return <RecordsCard key={slot.id} slot={slot} />;
      case "tonnage":
        return (
          <MetricChart
            key={slot.id}
            slot={slot}
            title="Total tonnage"
            pick={pickVolume}
            format={(value) => formatTonnage(value, unit)}
            placeholder={PLACEHOLDER_TONNAGE_KG}
          />
        );
      case "duration":
        return (
          <MetricChart
            key={slot.id}
            slot={slot}
            title="Time in gym"
            pick={pickDuration}
            format={formatHoursMinutes}
            placeholder={PLACEHOLDER_DURATION_MS}
          />
        );
    }
  };

  return (
    <ExerciseReorderProvider
      count={blocks.length}
      onReorder={reorder}
      onReorderingChange={setReordering}
    >
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        // A lifted block moves with the finger; scrolling under it at the same
        // time would put it somewhere the drop test can't see.
        scrollEnabled={!reordering}
      >
        {blocks.map((id, index) => render(slotFor(id, index)))}
      </ScrollView>
    </ExerciseReorderProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    // Must match the pitch `exercise-reorder` computes a drop slot from.
    gap: Spacing.three,
  },
});
