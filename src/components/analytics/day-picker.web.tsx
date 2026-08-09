import { ThemedText } from '@/components/themed-text';

/** No SwiftUI on web; the custom range bounds are read-only there. */
export function DayPicker({ value }: { value: Date; onChange: (next: Date) => void }) {
  return (
    <ThemedText themeColor="textSecondary">
      {value.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
    </ThemedText>
  );
}
