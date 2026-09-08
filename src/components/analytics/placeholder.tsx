import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { SeriesPoint } from "@/lib/analytics-series";

const DAY_MS = 86_400_000;

/**
 * The shape a chart wears with nothing to plot. It is decorative — drawn muted
 * and without axis labels, under a pill that says what unlocks the card — so no
 * one reads a number off the axis; only its rise and fall have to look like
 * training. Values are in the metric's own unit, so the readout above it can
 * still be formatted the ordinary way.
 */
export function placeholderSeries(
  values: readonly number[],
  endingAt: number = Date.now(),
): SeriesPoint[] {
  // Real days, so the axis a placeholder draws reads like the axis it replaces.
  const last = Math.floor(endingAt / DAY_MS) * DAY_MS;
  return values.map((value, index) => {
    const start = last - (values.length - 1 - index) * DAY_MS;
    return { start, end: start + DAY_MS, value };
  });
}

export const PLACEHOLDER_POINTS = placeholderSeries([
  2, 3.4, 2.6, 3.1, 4.4, 3.6, 4, 5.4,
]);

/**
 * An empty card shows what it will look like full rather than a bare icon: the
 * preview underneath, dimmed and inert, and the reason on top.
 */
export function CardPlaceholder({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View>
      <View pointerEvents="none" style={styles.preview}>
        {children}
      </View>
      <View pointerEvents="none" style={styles.center}>
        <View
          style={[styles.pill, { backgroundColor: theme.backgroundElement }]}
        >
          <Icon name="lock.fill" size={14} tintColor={theme.textSecondary} />
          <ThemedText
            type="subhead"
            weight="semibold"
            themeColor="textSecondary"
          >
            {text}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { opacity: 0.55 },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
});
