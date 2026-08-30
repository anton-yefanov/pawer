import { Button, Host, Menu, Text, ZStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  contentShape,
  frame,
  shapes,
} from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Pill } from "@/components/exercises/pill";
import { type IconName } from "@/components/icon";
import { periodLabel, type PeriodId } from "@/lib/analytics-period";
import * as haptics from "@/lib/haptics";

/**
 * The pill is a real React Native view and the SwiftUI `Menu` is a transparent
 * host laid over it — a Menu's tap target is exactly its label, and there is no
 * way to put an RN view inside one. Redrawing the capsule in SwiftUI would mean
 * keeping two copies of the same control in step, which is worse.
 */
export function PeriodMenu<Id extends PeriodId>({
  value,
  periods,
  icon = "calendar",
  raised,
  locked,
  onChange,
}: {
  value: Id;
  periods: readonly { id: PeriodId; label: string }[];
  /** `null` next to controls that carry no glyphs of their own. */
  icon?: IconName | null;
  raised?: boolean;
  /** Draws a lock on the row; picking it still calls `onChange`. */
  locked?: (id: PeriodId) => boolean;
  onChange: (next: Id) => void;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  return (
    <View style={styles.host}>
      <Pill
        icon={icon ?? undefined}
        label={periodLabel(value)}
        raised={raised}
        trailing="chevron.down"
        onLayout={(event) => setSize(event.nativeEvent.layout)}
      />

      {size && (
        <Host style={[styles.overlay, size]}>
          <Menu
            modifiers={[buttonStyle("plain")]}
            label={
              <ZStack
                modifiers={[frame(size), contentShape(shapes.rectangle())]}
              >
                <Text> </Text>
              </ZStack>
            }
          >
            {/*
              Buttons rather than a `Picker`: a Picker draws its checkmark in a
              column of its own, so a row carrying any icon of its own is inset
              past two. Here the checkmark and the lock share one.
            */}
            {periods.map((period) => (
              <Button
                key={period.id}
                label={period.label}
                systemImage={
                  locked?.(period.id)
                    ? "lock.fill"
                    : period.id === value
                      ? "checkmark"
                      : undefined
                }
                onPress={() => {
                  haptics.select();
                  onChange(period.id as Id);
                }}
              />
            ))}
          </Menu>
        </Host>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "flex-start",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
