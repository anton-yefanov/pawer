import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Menu, type MenuItem } from "@/components/android/menu";
import { Pill } from "@/components/exercises/pill";
import { type IconName } from "@/components/icon";
import { t } from "@/i18n";
import {
  periodLabel,
  shortPeriodLabel,
  type PeriodId,
} from "@/lib/analytics-period";
import * as haptics from "@/lib/haptics";

export function PeriodMenu<Id extends PeriodId>({
  value,
  periods,
  icon = "calendar",
  raised,
  compact,
  locked,
  onChange,
}: {
  value: Id;
  periods: readonly { id: PeriodId; label: string }[];
  /** `null` next to controls that carry no glyphs of their own. */
  icon?: IconName | null;
  raised?: boolean;
  /** A smaller pill reading "3M"; the menu keeps the long labels. */
  compact?: boolean;
  /** Draws a lock on the row; picking it still calls `onChange`. */
  locked?: (id: PeriodId) => boolean;
  onChange: (next: Id) => void;
}) {
  const [open, setOpen] = useState(false);

  const items: MenuItem[] = periods.map((period) => ({
    key: period.id,
    label: period.label,
    selected: period.id === value,
    locked: locked?.(period.id),
    onPress: () => {
      haptics.select();
      onChange(period.id as Id);
    },
  }));

  return (
    <View style={styles.host}>
      <Menu
        open={open}
        title={t("exercises:period")}
        items={items}
        onClose={() => setOpen(false)}
      >
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
          {({ pressed }) => (
            <Pill
              icon={icon ?? undefined}
              label={compact ? shortPeriodLabel(value) : periodLabel(value)}
              compact={compact}
              raised={raised}
              trailing="chevron.down"
              pressed={pressed}
            />
          )}
        </Pressable>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "flex-start",
  },
});
