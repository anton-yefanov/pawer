import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BlockSlot } from "@/components/analytics/analytics-block";
import { MetricChart } from "@/components/analytics/metric-chart";
import { RecordsCard } from "@/components/analytics/records-card";
import { SummaryBlock } from "@/components/analytics/summary-block";
import { TrainingDaysBlock } from "@/components/analytics/training-days-block";
import { CircleButton } from "@/components/circle-button";
import { Icon } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import {
  ExerciseReorderProvider,
  type Settle,
} from "@/components/workout/exercise-reorder";
import { BigButton } from "@/components/workout/big-button";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  BLOCK_CATALOG,
  useBlockLayout,
  type BlockId,
} from "@/lib/analytics-layout";
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
  const insets = useSafeAreaInsets();
  const layout = useBlockLayout();
  const { blocks } = layout;
  const empty = blocks.length === 0;
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

  const addChart = () => router.push("/analytics/add-block");

  const render = (slot: BlockSlot) => {
    switch (slot.id) {
      case "summary":
        return <SummaryBlock key={slot.id} slot={slot} />;
      case "days":
        return <TrainingDaysBlock key={slot.id} slot={slot} />;
      case "records":
        return <RecordsCard key={slot.id} slot={slot} />;
      case "tonnage":
        return (
          <MetricChart
            key={slot.id}
            slot={slot}
            title={BLOCK_CATALOG.tonnage.title}
            pick={pickVolume}
            format={(value) => formatTonnage(value, unit)}
            formatAxis={(value) => formatTonnage(value, unit, true)}
            placeholder={PLACEHOLDER_TONNAGE_KG}
          />
        );
      case "duration":
        return (
          <MetricChart
            key={slot.id}
            slot={slot}
            title={BLOCK_CATALOG.duration.title}
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two },
        ]}
        // The title is content here, so the notch is cleared by the padding
        // above, as on Home.
        contentInsetAdjustmentBehavior="never"
        // A lifted block moves with the finger; scrolling under it at the same
        // time would put it somewhere the drop test can't see.
        scrollEnabled={!reordering && !empty}
      >
        <View style={styles.title}>
          <ThemedText type="largeTitle">Analytics</ThemedText>
          <CircleButton symbol="plus" label="Add Chart" onPress={addChart} />
        </View>

        {blocks.map((id, index) => render(slotFor(id, index)))}
      </ScrollView>
      {empty && (
        <View style={styles.empty} pointerEvents="box-none">
          <Icon
            name="chart.line.uptrend.xyaxis"
            size={64}
            tintColor={theme.textTertiary}
          />
          <ThemedText type="title2" weight="bold" style={styles.emptyTitle}>
            See Your Progress
          </ThemedText>
          <ThemedText
            type="body"
            themeColor="textSecondary"
            style={styles.emptyText}
          >
            Add a chart to follow your training and watch your strength grow.
          </ThemedText>
          <View style={styles.emptyButton}>
            <BigButton title="Add Chart" onPress={addChart} />
          </View>
        </View>
      )}
    </ExerciseReorderProvider>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Laid over the whole screen rather than under the title, so the message sits
  // at the screen's true centre.
  empty: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  emptyTitle: { marginTop: Spacing.three, textAlign: "center" },
  emptyText: { marginTop: Spacing.two, maxWidth: 280, textAlign: "center" },
  emptyButton: {
    marginTop: Spacing.four,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    // Must match the pitch `exercise-reorder` computes a drop slot from.
    gap: Spacing.three,
  },
});
