import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { BlockSlot } from "@/components/analytics/analytics-block";
import { BlockView } from "@/components/analytics/block-view";
import { CircleButton } from "@/components/circle-button";
import { Icon } from "@/components/icon";
import { TabTitle, TAB_TITLE_INSET } from "@/components/tab-title";
import { ThemedText } from "@/components/themed-text";
import {
  ExerciseReorderProvider,
  type Settle,
} from "@/components/workout/exercise-reorder";
import { BigButton } from "@/components/workout/big-button";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useBlockLayout, type BlockId } from "@/lib/analytics-layout";
import * as haptics from "@/lib/haptics";
import { move } from "@/lib/order";

export default function AnalyticsScreen() {
  const theme = useTheme();
  const layout = useBlockLayout();
  const { blocks } = layout;
  const empty = blocks.length === 0;
  const [reordering, setReordering] = useState(false);

  const reorder = (from: number, to: number, settle: Settle) => {
    void layout.reorder(move(blocks, from, to));
    settle();
    haptics.complete();
  };

  const slotFor = (id: BlockId, index: number): BlockSlot => {
    const count = blocks.length;
    const moveTo = (to: number) => void layout.reorder(move(blocks, index, to));
    return {
      id,
      index,
      draggable: true,
      detailPrefix: "/analytics",
      actions: [
        ...(index > 0
          ? [
              {
                label: "Move Up",
                icon: "arrow.up" as const,
                onPress: () => moveTo(index - 1),
              },
            ]
          : []),
        ...(index < count - 1
          ? [
              {
                label: "Move Down",
                icon: "arrow.down" as const,
                onPress: () => moveTo(index + 1),
              },
            ]
          : []),
        {
          label: "Remove",
          icon: "trash",
          destructive: true,
          separated: count > 1,
          onPress: () => {
            haptics.warn();
            void layout.remove(id);
          },
        },
      ],
    };
  };

  const addChart = () => router.push("/analytics/add-block");

  return (
    <ExerciseReorderProvider
      count={blocks.length}
      onReorder={reorder}
      onReorderingChange={setReordering}
    >
      <View style={styles.screen}>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={[
            styles.content,
            { paddingTop: TAB_TITLE_INSET },
          ]}
          // The title is content here, so the notch is cleared by the padding
          // above, as on Home.
          contentInsetAdjustmentBehavior="never"
          // A lifted block moves with the finger; scrolling under it at the same
          // time would put it somewhere the drop test can't see.
          scrollEnabled={!reordering && !empty}
        >
          <View style={styles.title}>
            <TabTitle title="Analytics">
              <CircleButton
                symbol="plus"
                label="Add Chart"
                onPress={addChart}
              />
            </TabTitle>
          </View>

          {blocks.map((id, index) => (
            <BlockView key={id} slot={slotFor(id, index)} />
          ))}
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
      </View>
    </ExerciseReorderProvider>
  );
}

const styles = StyleSheet.create({
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
  screen: {
    flex: 1,
  },
  // Tops up the block gap to Home's, so a widget sits on the same line.
  title: {
    marginBottom: Spacing.four - Spacing.three,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    // Must match the pitch `exercise-reorder` computes a drop slot from.
    gap: Spacing.three,
  },
});
