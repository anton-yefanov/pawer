import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { Spacing, type TypeRole } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatDelta, type Delta } from "@/lib/analytics-compare";

export type StatTile = {
  label: string;
  value: string;
  unit?: string;
  delta?: Delta | null;
};

const COLUMNS = 3;

export function StatGrid({ tiles }: { tiles: readonly StatTile[] }) {
  const theme = useTheme();
  const rule = { backgroundColor: theme.backgroundElement };
  const rows = Array.from(
    { length: Math.ceil(tiles.length / COLUMNS) },
    (_, index) => tiles.slice(index * COLUMNS, (index + 1) * COLUMNS),
  );
  // Space for a delta is held on every tile as soon as one shows, so the rows
  // stay the same height and the grid doesn't reflow when a comparison lands.
  const reserve = tiles.some((tile) => tile.delta);

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <Fragment key={row.map((tile) => tile.label).join()}>
          {rowIndex > 0 && <View style={[styles.rowRule, rule]} />}
          <View style={styles.row}>
            {row.map((tile, index) => (
              <Fragment key={tile.label}>
                {index > 0 && <View style={[styles.columnRule, rule]} />}
                <Tile {...tile} reserve={reserve} />
              </Fragment>
            ))}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const ARROWS = {
  up: "arrow.up.right",
  down: "arrow.down.right",
  flat: "minus",
} as const;

/**
 * A gain is tinted green, but a drop is never red: a lighter month is often a
 * deliberate one, and an app that colours a deload as failure is giving bad
 * advice.
 */
function DeltaLine({ value }: { value: Delta }) {
  const theme = useTheme();
  const tint = value.direction === "up" ? theme.positive : theme.textSecondary;

  return (
    <View style={styles.delta}>
      <Icon
        name={ARROWS[value.direction]}
        size={11}
        tintColor={tint}
        resizeMode="scaleAspectFit"
        style={styles.arrow}
      />
      <ThemedText
        type="caption1"
        weight="semibold"
        numeric
        numberOfLines={1}
        style={{ color: tint }}
      >
        {formatDelta(value)}
      </ThemedText>
    </View>
  );
}

/**
 * Sized from the string rather than by `adjustsFontSizeToFit`: the native
 * measurement latches onto whatever width it saw during a transient layout pass
 * — mounting the custom range's SwiftUI date pickers is enough — and shrinks the
 * number to a fraction of its size with no way back.
 */
function valueRole(value: string): TypeRole {
  if (value.length <= 4) return "title2";
  if (value.length <= 6) return "title3";
  if (value.length <= 8) return "headline";
  return "subhead";
}

function Tile({
  label,
  value,
  unit,
  delta,
  reserve,
}: StatTile & { reserve: boolean }) {
  return (
    <View style={styles.tile}>
      {/* The fixed box keeps labels level across cards whose values size
          differently; the inner row is what centres a shorter value in it
          instead of hanging it from the top. */}
      <View style={styles.measureBox}>
        <View style={styles.measure}>
          <ThemedText
            type={valueRole(value)}
            numeric
            style={styles.value}
            numberOfLines={1}
          >
            {value}
          </ThemedText>
          {unit && (
            <ThemedText type="footnote" themeColor="textSecondary">
              {unit}
            </ThemedText>
          )}
        </View>
      </View>
      <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      {reserve && (
        <View style={styles.deltaSlot}>
          {delta && <DeltaLine value={delta} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  rowRule: {
    height: StyleSheet.hairlineWidth,
  },
  columnRule: {
    width: StyleSheet.hairlineWidth,
    marginVertical: Spacing.two,
  },
  tile: {
    flex: 1,
    gap: Spacing.half,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.one,
  },
  measureBox: {
    height: 28,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  measure: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: Spacing.half,
  },
  value: {
    flexShrink: 1,
  },
  deltaSlot: {
    height: 16,
    justifyContent: "center",
  },
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
  },
  arrow: {
    width: 11,
    height: 11,
  },
});
