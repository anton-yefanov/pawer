import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Wheel } from '@/components/android/wheel';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDebouncedWrite } from '@/hooks/use-debounced-write';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/units';

const CELL_HEIGHT = 32;

/** Long enough for any set anyone logs, short enough to keep the wheel scrollable. */
const MAX_HOURS = 12;

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

const HOURS = range(MAX_HOURS);
const SIXTY = range(60);

type Props = {
  seconds: number | null;
  /** The previous session's time, shown as ghost text while the cell is empty. */
  placeholder: number | null;
  width: number;
  highlighted: boolean;
  completed: boolean;
  onEdit: (seconds: number) => void;
  onCommit: (seconds: number) => void;
};

/**
 * Time is picked on wheels rather than typed, same as iOS — see the comment on
 * the iOS cell for why. Compose has no wheel `Picker` and its `TimePickerDialog`
 * is a clock dial with no seconds, so the wheels are `Wheel`, and they live in a
 * dialog rather than a popover: an anchored popover over a 40pt cell in the
 * middle of a scrolling logger has nowhere to land on a phone.
 *
 * The debounce and `draft` do the same job they do on iOS — a spin crosses a lot
 * of detents and each one would otherwise wake every live query on the screen.
 */
export function DurationCell({
  seconds,
  placeholder,
  width,
  highlighted,
  completed,
  onEdit,
  onCommit,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const write = useDebouncedWrite(onCommit);

  const value = draft ?? seconds;
  const total = value ?? 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;

  const change = (next: number) => {
    setDraft(next);
    onEdit(next);
    write.push(next);
  };

  const close = () => {
    setOpen(false);
    write.flush();
  };

  const fill = highlighted
    ? theme.dangerHighlight
    : completed
      ? theme.successElement
      : theme.backgroundElement;

  const label = value ?? placeholder;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Duration"
        onPress={() => setOpen(true)}
        style={[styles.cell, { width, backgroundColor: fill }]}>
        <ThemedText themeColor={value == null ? 'textSecondary' : 'text'}>
          {label == null ? ' ' : formatDuration(label)}
        </ThemedText>
      </Pressable>

      {/* Mounted only while open: `Wheel` seeds its scroll position once, so a
          modal left in the tree would reopen on the value it was closed at. */}
      {open && (
        <Modal
          visible
          transparent
          statusBarTranslucent
          navigationBarTranslucent
          animationType="fade"
          onRequestClose={close}>
          <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={close} />

          <View style={styles.centre} pointerEvents="box-none">
            <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
              <ThemedText type="footnote" weight="semibold" themeColor="textSecondary">
                Duration
              </ThemedText>

              <View style={styles.wheels}>
                <Wheel
                  unit="hr"
                  values={HOURS}
                  selection={hours}
                  onChange={(next) => change(next * 3600 + minutes * 60 + (total % 60))}
                />
                <Wheel
                  unit="min"
                  values={SIXTY}
                  selection={minutes}
                  onChange={(next) => change(hours * 3600 + next * 60 + (total % 60))}
                />
                <Wheel
                  unit="sec"
                  values={SIXTY}
                  selection={total % 60}
                  onChange={(next) => change(hours * 3600 + minutes * 60 + next)}
                />
              </View>

              <Pressable onPress={close} style={styles.done}>
                <ThemedText type="footnote" weight="semibold" themeColor="accent">
                  Done
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cell: {
    height: CELL_HEIGHT,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    alignItems: 'center',
    borderRadius: 28,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  wheels: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
