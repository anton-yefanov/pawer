import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { CardPlaceholder } from "@/components/analytics/placeholder";
import { PrChip } from "@/components/pr-chip";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { PeriodRecordRow } from "@/lib/analytics-queries";
import { formatPrValue, isPrKind, PR_LABELS } from "@/lib/personal-records";
import type { WeightUnit } from "@/lib/units";

/** A highlight reel, not a log: a hard quarter can set dozens of records. */
const VISIBLE = 8;

/** Shape only: an empty card previews its own layout under the "no records" pill. */
const PLACEHOLDER_ROWS = [
  { name: "Bench Press", kind: "heaviest_weight", value: 80 },
  { name: "Back Squat", kind: "best_1rm", value: 120 },
  { name: "Deadlift", kind: "best_volume", value: 4200 },
] as const;

export function RecordsCard({
  records,
  unit,
}: {
  records: readonly PeriodRecordRow[];
  unit: WeightUnit;
}) {
  const theme = useTheme();

  const known = records.filter((record) => isPrKind(record.kind));
  const shown = known.slice(0, VISIBLE);
  const hidden = known.length - shown.length;

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
        <ThemedText type="headline">Personal records</ThemedText>
        {known.length > 0 && (
          <ThemedText type="footnote" themeColor="textSecondary">
            {known.length}
          </ThemedText>
        )}
      </View>

      {shown.length === 0 ? (
        <CardPlaceholder text="Log a workout to unlock">
          {PLACEHOLDER_ROWS.map((row, index) => (
            <Fragment key={row.name}>
              {index > 0 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                />
              )}
              <View style={styles.row}>
                <ThemedText numberOfLines={1} style={styles.name}>
                  {row.name}
                </ThemedText>
                <PrChip label={PR_LABELS[row.kind]} />
                <ThemedText type="headline" numeric style={styles.value}>
                  {formatPrValue(row.kind, row.value, unit)}
                </ThemedText>
              </View>
            </Fragment>
          ))}
        </CardPlaceholder>
      ) : (
        <View>
          {shown.map((record, index) => (
            <Fragment key={record.id}>
              {index > 0 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                />
              )}
              <View style={styles.row}>
                <ThemedText numberOfLines={1} style={styles.name}>
                  {record.exerciseName}
                </ThemedText>
                {isPrKind(record.kind) && (
                  <PrChip label={PR_LABELS[record.kind]} />
                )}
                <ThemedText type="headline" numeric style={styles.value}>
                  {isPrKind(record.kind)
                    ? formatPrValue(record.kind, record.value, unit)
                    : ""}
                </ThemedText>
              </View>
            </Fragment>
          ))}

          {hidden > 0 && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.backgroundElement },
                ]}
              />
              <View style={styles.row}>
                <ThemedText type="footnote" themeColor="textSecondary">
                  + {hidden} more
                </ThemedText>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: 40,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  name: {
    flexShrink: 1,
  },
  value: {
    marginLeft: "auto",
  },
});
