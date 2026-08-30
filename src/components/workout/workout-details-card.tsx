import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StartTimePicker } from '@/components/workout/start-time-picker';
import { Spacing, Type, Weights } from '@/constants/theme';
import { useDebouncedWrite } from '@/hooks/use-debounced-write';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import type { Workout } from '@/db/schema';
import { updateWorkout } from '@/lib/workout-actions';
import { attempt } from '@/lib/observability';

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
          onChange={(next) =>
            void attempt('workout', updateWorkout(workout.id, { startedAt: next.getTime() }), {
              title: 'Couldn’t save',
              message: 'Your last change wasn’t saved. Please try again.',
            })
          }
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
  const [text, setText] = useState(value);
  const focused = useRef(false);
  const write = useDebouncedWrite(onCommit);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <ThemedTextInput
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
      style={[style]}
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
    ...Type.title1,
    // The size already carries the hierarchy here, so the role's bold would only
    // double up — a placeholder is the field's resting state, and a heavy one
    // shouts through it. Medium keeps it a title without the shout.
    fontWeight: Weights.medium,
    // No lineHeight: iOS centres the glyph box inside it and clips descenders.
    lineHeight: undefined,
    minHeight: 52,
  },
  notesInput: {
    minHeight: 48,
    paddingVertical: 14,
  },
});
