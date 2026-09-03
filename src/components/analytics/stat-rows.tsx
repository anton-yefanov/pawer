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

export type StatRow =
  /** One card per tile, side by side. */
  | { tiles: readonly StatTile[] }
  /** A single card the tiles share, divided by hairlines. */
  | { split: readonly StatTile[] };

export function StatRows({ rows }: { rows: readonly StatRow[] }) {
  const theme = useTheme();

  return (
    <View style={styles.stack}>
      {rows.map((row) => {
        const tiles = "split" in row ? row.split : row.tiles;
        // Space for a delta is held only where a neighbour actually shows one,
        // so tiles side by side keep their labels on one line without every
        // card growing a blank strip when the period has nothing to compare.
        const reserve = tiles.some((tile) => tile.delta);

        return "split" in row ? (
          <View
            key={row.split.map((tile) => tile.label).join()}
            style={[
              styles.card,
              styles.splitCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.backgroundElement,
              },
            ]}
          >
            {row.split.map((tile, index) => (
              <Fragment key={tile.label}>
                {index > 0 && (
                  <View
                    style={[
                      styles.splitRule,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  />
                )}
                <Tile {...tile} reserve={reserve} />
              </Fragment>
            ))}
          </View>
        ) : (
          <View
            key={row.tiles.map((tile) => tile.label).join()}
            style={styles.row}
          >
            {row.tiles.map((tile) => (
              <View
                key={tile.label}
                style={[
                  styles.card,
                  styles.rowCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.backgroundElement,
                  },
                ]}
              >
                <Tile {...tile} reserve={reserve} />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const ARROWS = {
  up: "arrow.up.right",
  down: "arrow.down.right",
  flat: "minus",
} as const;

/**
 * Deltas are never red or green. A lighter month is often a deliberate one, and
 * an app that colours a deload as failure is giving bad advice; direction is
 * carried by the glyph alone.
 */
function DeltaLine({ value }: { value: Delta }) {
  const theme = useTheme();

  return (
    <View style={styles.delta}>
      <Icon
        name={ARROWS[value.direction]}
        size={11}
        tintColor={theme.textSecondary}
        resizeMode="scaleAspectFit"
        style={styles.arrow}
      />
      <ThemedText
        type="caption1"
        weight="semibold"
        numeric
        themeColor="textSecondary"
        numberOfLines={1}
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
  if (value.length <= 5) return "title1";
  if (value.length <= 7) return "title2";
  if (value.length <= 8) return "title3";
  return "headline";
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
            <ThemedText type="headline" themeColor="textSecondary">
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
  stack: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
  },
  rowCard: {
    flex: 1,
  },
  splitCard: {
    flexDirection: "row",
  },
  splitRule: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.two,
  },
  tile: {
    flex: 1,
    gap: Spacing.one,
    alignItems: "center",
    justifyContent: "center",
  },
  measureBox: {
    height: 36,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  measure: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: Spacing.one,
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
