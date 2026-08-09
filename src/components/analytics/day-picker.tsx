import { DatePicker, HStack, Host, Spacer } from '@expo/ui/swift-ui';
import { StyleSheet } from 'react-native';

/**
 * Compact SwiftUI date picker, trailing-aligned in whatever width the row has
 * left — see PeriodMenu for why the host isn't given a fixed one.
 */
export function DayPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (next: Date) => void;
}) {
  return (
    <Host style={styles.host}>
      <HStack>
        <Spacer />
        <DatePicker selection={value} displayedComponents={['date']} onDateChange={onChange} />
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
