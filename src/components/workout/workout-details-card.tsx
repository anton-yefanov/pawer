import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StartTimePicker } from '@/components/workout/start-time-picker';
import { Spacing } from '@/constants/theme';
import { useDebouncedWrite } from '@/hooks/use-debounced-write';
import { useTheme } from '@/hooks/use-theme';
import type { Workout } from '@/db/schema';
import { updateWorkout } from '@/lib/workout-actions';

export function WorkoutDetailsCard({ workout }: { workout: Workout }) {
  const theme = useTheme();
  const [openedAt] = useState(() => Date.now());

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <WriteThroughField
        value={workout.name ?? ''}
        placeholder="Name"
        style={styles.nameInput}
        onCommit={(name) => updateWorkout(workout.id, { name: name.trim() || null })}
      />

      <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />

      <View style={styles.row}>
        <ThemedText>Start Time</ThemedText>
        <StartTimePicker
          value={new Date(workout.startedAt)}
          max={new Date(workout.finishedAt ?? openedAt)}
          onChange={(next) => updateWorkout(workout.id, { startedAt: next.getTime() })}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />

      <WriteThroughField
        value={workout.notes ?? ''}
        placeholder="Notes"
        multiline
        style={styles.notesInput}
        onCommit={(notes) => updateWorkout(workout.id, { notes: notes.trim() || null })}
      />
    </View>
  );
}

/**
 * While the field has focus its own state wins; the row only flows back in when
 * it doesn't. Without the guard a live-query re-render mid-typing rewrites the
 * value from the database and throws the caret to the end.
 */
function WriteThroughField({
  value,
  onCommit,
  style,
  ...rest
}: {
  value: string;
  onCommit: (next: string) => void;
  style?: object;
} & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  const [text, setText] = useState(value);
  const focused = useRef(false);
  const write = useDebouncedWrite(onCommit);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(next) => {
        setText(next);
        write.push(next);
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onEndEditing={() => {
        focused.current = false;
        write.flush();
      }}
      placeholderTextColor={theme.textSecondary}
      style={[{ color: theme.text }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '600',
    minHeight: 52,
  },
  notesInput: {
    fontSize: 16,
    lineHeight: 20,
    minHeight: 48,
    paddingVertical: 14,
  },
});
