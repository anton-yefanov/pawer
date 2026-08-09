import { DatePicker, Host } from '@expo/ui/swift-ui';

/**
 * Compact SwiftUI `DatePicker` — tapping the value opens the system wheel in a
 * popover, which is the interaction the reference screenshot shows.
 *
 * The `Host` is explicitly sized. `matchContents` collapses a compact picker to
 * a few points wide here, the same trap the exercise filter menu documents.
 */
export function StartTimePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (next: Date) => void;
}) {
  return (
    <Host style={{ width: 220, height: 34 }}>
      <DatePicker
        selection={value}
        displayedComponents={['date', 'hourAndMinute']}
        onDateChange={onChange}
      />
    </Host>
  );
}
