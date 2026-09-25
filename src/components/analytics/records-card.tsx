import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AnalyticsBlock,
  useBlockPeriod,
  type BlockSlot,
} from "@/components/analytics/analytics-block";
import { CardPlaceholder } from "@/components/analytics/placeholder";
import { PrChip } from "@/components/pr-chip";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";
import { periodRecordsQuery } from "@/lib/analytics-queries";
import { formatPrValue, isPrKind, PR_LABELS } from "@/lib/personal-records";
import { BLOCK_CATALOG } from "@/lib/analytics-layout";
import { useWeightUnit } from "@/lib/weight-unit";

/** A highlight reel, not a log — and the block's fixed height holds five rows plus "more". */
const VISIBLE = 5;

/** Shape only: an empty card previews its own layout under the "no records" pill. */
const PLACEHOLDER_ROWS = [
  { name: t("analytics:placeholder.bench"), kind: "heaviest_weight", value: 80 },
  { name: t("analytics:placeholder.squat"), kind: "best_1rm", value: 120 },
  { name: t("analytics:placeholder.deadlift"), kind: "best_volume", value: 4200 },
  { name: t("analytics:placeholder.pullUp"), kind: "most_reps", value: 15 },
  { name: t("analytics:placeholder.overhead"), kind: "heaviest_weight", value: 55 },
  { name: t("analytics:placeholder.row"), kind: "best_1rm", value: 90 },
] as const;

export function RecordsCard({ slot }: { slot: BlockSlot }) {
  const theme = useTheme();
  const unit = useWeightUnit();
  const { period, range, select } = useBlockPeriod();
  const { data: records } = useLiveQuery(periodRecordsQuery(range), [range]);

  const known = (records ?? []).filter((record) => isPrKind(record.kind));
  const shown = known.slice(0, VISIBLE);
  const hidden = known.length - shown.length;

  return (
    <AnalyticsBlock
      slot={slot}
      title={BLOCK_CATALOG.records.title}
      subtitle={
        known.length === 0
          ? t("analytics:noneYet")
          : t("analytics:records.setInPeriod", { count: known.length })
      }
      period={period}
      onPeriodChange={select}
    >
      {shown.length === 0 ? (
        <CardPlaceholder text={t("analytics:locked")}>
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
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: `${slot.detailPrefix}/records` as const,
                    params: { period },
                  })
                }
                style={styles.row}
              >
                <ThemedText type="subhead" themeColor="accent">
                  {t("analytics:more", { count: hidden })}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      )}
    </AnalyticsBlock>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: 39,
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
