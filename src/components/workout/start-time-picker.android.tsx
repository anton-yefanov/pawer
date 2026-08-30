import { DatePickerDialog, Host, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import { formatStartTime } from '@/lib/workout-stats';

/**
 * Material has no combined date-and-time picker — `dateAndTime` degrades to a
 * plain date picker on Android — so the two dialogs are chained: the day is
 * picked first and held in `day`, which is also what keeps the time dialog
 * mounted for the second leg. Nothing is written until both have been answered.
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
  const theme = useTheme();
  const [pickingDay, setPickingDay] = useState(false);
  const [day, setDay] = useState<Date | null>(null);

  const commit = (time: Date) => {
    const next = new Date(day ?? value);
    next.setHours(time.getHours(), time.getMinutes(), 0, 0);
    setDay(null);
    onChange(max != null && next > max ? max : next);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start time, ${formatStartTime(value.getTime())}`}
        onPress={() => {
          haptics.tap();
          setPickingDay(true);
        }}
        style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="footnote">{formatStartTime(value.getTime())}</ThemedText>
      </Pressable>

      {pickingDay && (
        <Host style={styles.dialogHost}>
          <DatePickerDialog
            initialDate={value.toISOString()}
            color={theme.accent}
            selectableDates={{ end: max }}
            onDateSelected={(next) => {
              setPickingDay(false);
              setDay(next);
            }}
            onDismissRequest={() => setPickingDay(false)}
          />
        </Host>
      )}

      {day != null && (
        <Host style={styles.dialogHost}>
          <TimePickerDialog
            initialDate={value.toISOString()}
            color={theme.accent}
            onDateSelected={commit}
            onDismissRequest={() => setDay(null)}
          />
        </Host>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 8,
  },
  dialogHost: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});
