import { ThemedText } from '@/components/themed-text';
import { formatStartTime } from '@/lib/workout-stats';

/** No SwiftUI on web; the start time is read-only there. */
export function StartTimePicker({ value }: { value: Date; onChange: (next: Date) => void }) {
  return <ThemedText themeColor="textSecondary">{formatStartTime(value.getTime())}</ThemedText>;
}
