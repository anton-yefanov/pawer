import { DatePicker, HStack, Host, Spacer } from '@expo/ui/swift-ui';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Compact SwiftUI date picker, trailing-aligned in whatever width the row has
 * left — see PeriodMenu for why the host isn't given a fixed one.
 *
 * SwiftUI keeps the calendar popover up after a tap and there is no API to
 * dismiss it, so picking a day remounts the native view, which takes the
 * presentation down with it.
 */
export function DayPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: Date;
  onChange: (next: Date) => void;
  min?: Date;
  max?: Date;
}) {
  const [generation, setGeneration] = useState(0);

  return (
    <Host style={styles.host}>
      <HStack>
        <Spacer />
        <DatePicker
          key={generation}
          selection={value}
          range={{ start: min, end: max }}
          displayedComponents={['date']}
          onDateChange={(next) => {
            onChange(next);
            setGeneration((n) => n + 1);
          }}
        />
      </HStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    height: 34,
  },
});
