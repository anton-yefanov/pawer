import { TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type ThemedTextInputProps = TextInputProps & {
  ref?: React.Ref<TextInput>;
};

/**
 * Every text field in the app, so the four theme-dependent props they all want
 * are written once.
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
      placeholderTextColor={theme.textSecondary}
      underlineColorAndroid="transparent"
      cursorColor={theme.accent}
      selectionColor={theme.accent}
      style={[{ color: theme.text }, style]}
      {...rest}
    />
  );
}
