import { Pressable, StyleSheet, View } from "react-native";

import { Pill } from "@/components/exercises/pill";
import { Spacing } from "@/constants/theme";
import * as haptics from "@/lib/haptics";

export type ExerciseTab = {
  id: string;
  label: string;
};

export function ExerciseTabs({
  tabs,
  value,
  raised,
  onChange,
}: {
  tabs: readonly ExerciseTab[];
  value: string;
  /** Tabs on the grey page rather than inside a card. */
  raised?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.id === value;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.select();
              onChange(tab.id);
            }}
          >
            {({ pressed }) => (
              <Pill
                label={tab.label}
                active={active}
                raised={raised}
                pressed={pressed}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
});
