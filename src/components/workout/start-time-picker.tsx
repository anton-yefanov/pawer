import { DatePicker, HStack, Host, Spacer } from '@expo/ui/swift-ui';
import { StyleSheet } from 'react-native';

/**
 * Compact SwiftUI `DatePicker` — tapping the value opens the system wheel in a
 * popover, which is the interaction the reference screenshot shows.
 *
 * Trailing-aligned in whatever width the row has left, like DayPicker: a fixed
 * host width leaves dead space after the time pill, and `matchContents`
 * collapses a compact picker to a few points wide — the trap the exercise
 * filter menu documents.
 *
 * `ignoreSafeArea` because the hosting controller otherwise applies the keyboard
 * inset itself and slides the picker out of its row — the notes field on this
 * card opens the keyboard, so the pills land on top of the row below.
 */
export function StartTimePicker({
  value,
  onChange,
  max,
}: {
  value: Date;
  onChange: (next: Date) => void;
  max?: Date;
}) {
  return (
    <Host style={styles.host} ignoreSafeArea="all">
      <HStack>
        <Spacer />
        <DatePicker
          selection={value}
          range={{ end: max }}
          displayedComponents={['date', 'hourAndMinute']}
          onDateChange={onChange}
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
