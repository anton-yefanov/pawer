import { DatePickerDialog, Host } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

const formatDay = (date: Date) =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Material's date picker is a dialog, not an inline popover, so the row shows
 * the value as a chip and the calendar arrives over the screen. The dialog is
 * only mounted while open — a Compose host left in the tree measures and
 * composes for nothing.
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
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pick a date, currently ${formatDay(value)}`}
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="footnote">{formatDay(value)}</ThemedText>
      </Pressable>

      {open && (
        <Host style={styles.dialogHost}>
          <DatePickerDialog
            initialDate={value.toISOString()}
            color={theme.accent}
            selectableDates={{ start: min, end: max }}
            onDateSelected={(next) => {
              onChange(next);
              setOpen(false);
            }}
            onDismissRequest={() => setOpen(false)}
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
