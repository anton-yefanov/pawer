import { Host, Toggle } from '@expo/ui/swift-ui';
import { labelsHidden, toggleStyle } from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { groupedStyles } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import * as haptics from '@/lib/haptics';

const SWITCH = { width: 51, height: 31 } as const;

type Props = {
  label: string;
  leading?: ReactNode;
  value: boolean;
  onChange: (next: boolean) => void;
};

/** Same sizing rule as the other SwiftUI hosts here: size the `Host` or it collapses. */
export function ToggleRow({ label, leading, value, onChange }: Props) {
  return (
    <View style={[groupedStyles.row, leading != null && groupedStyles.rowWithLeading]}>
      {leading}
      <View style={groupedStyles.rowText}>
        <ThemedText>{label}</ThemedText>
      </View>
      <Host style={styles.switch}>
        <Toggle
          isOn={value}
          onIsOnChange={(next) => {
            haptics.select();
            onChange(next);
          }}
          modifiers={[toggleStyle('switch'), labelsHidden()]}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: SWITCH,
});
