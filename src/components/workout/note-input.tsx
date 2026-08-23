import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { ThemedTextInput } from '@/components/themed-text-input';

/**
 * An *uncontrolled* multiline TextInput never grows: layout only ever sees the
 * initial text, so the box stays one line high while iOS paints the wrapped
 * lines over whatever follows it. Holding the text in state is what gives
 * layout something to re-measure, and `scrollEnabled={false}` is what makes the
 * box take that height instead of scrolling the overflow out of sight.
 *
 * While the field has focus its own state wins; the row only flows back in when
 * it doesn't, or a live-query re-render mid-typing throws the caret to the end.
 */
export function NoteInput({
  value,
  minHeight = 32,
  onCommit,
  style,
  ...rest
}: {
  value: string;
  minHeight?: number;
  onCommit: (next: string) => void;
} & React.ComponentProps<typeof TextInput>) {
  const [text, setText] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <ThemedTextInput
      value={text}
      onChangeText={setText}
      multiline
      scrollEnabled={false}
      onFocus={() => {
        focused.current = true;
      }}
      onEndEditing={() => {
        focused.current = false;
        onCommit(text);
      }}
      style={[styles.input, { minHeight }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 14,
  },
});
