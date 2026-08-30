import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { base } from '@/components/themed-text';
import { Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextInputProps = TextInputProps & {
  ref?: React.Ref<TextInput>;
};

/**
 * Every text field in the app, so the four theme-dependent props they all want
 * are written once, on `body` and the same face as `ThemedText` — a field left to
 * its own devices renders Roboto on Android inside a Nunito app, which is the
 * Material tell the rest of the type system exists to avoid.
 *
 * `underlineColorAndroid` is the one that matters: the RN template's Android
 * theme points `android:editTextBackground` at `rn_edit_text_material`, which
 * draws Material's underline under a field that already has its own background.
 * The native theme cannot be fixed in the repo — `android/` is prebuild output —
 * so it is turned off here instead. The cursor and selection handles otherwise
 * tint from the template's leftover `colorPrimary`.
 */
export function ThemedTextInput({ style, ...rest }: ThemedTextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textTertiary}
      underlineColorAndroid="transparent"
      cursorColor={theme.accent}
      selectionColor={theme.accent}
      style={[styles.body, { color: theme.text }, style]}
      {...rest}
    />
  );
}

/** No `lineHeight`: a field centres its glyph box inside one and clips descenders. */
const styles = StyleSheet.create({ body: { ...base, ...Type.body, lineHeight: undefined } });
