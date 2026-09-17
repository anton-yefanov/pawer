import {
  KeyboardToolbar as Toolbar,
  type KeyboardToolbarProps,
} from 'react-native-keyboard-controller';

import { Colors } from '@/constants/theme';
import { TINTS } from '@/constants/tints';
import { useResolvedTint } from '@/lib/theme-preference';

const toolbarTheme = (tint: (typeof TINTS)[keyof typeof TINTS]): NonNullable<KeyboardToolbarProps['theme']> => ({
  light: {
    primary: tint.light.accent,
    disabled: Colors.light.textSecondary,
    background: Colors.light.surface,
    ripple: Colors.light.backgroundSelected,
  },
  dark: {
    primary: tint.dark.accent,
    disabled: Colors.dark.textSecondary,
    background: Colors.dark.surface,
    ripple: Colors.dark.backgroundSelected,
  },
});

/**
 * Only the arrows that walk a card's fields in order: `number-pad` and
 * `decimal-pad` have no return key and a multiline field's Enter inserts a
 * newline, so the order matters here in a way it doesn't on iOS. Getting *out*
 * is `KeyboardDismissButton`'s job on both platforms, which is why no `Done` is
 * rendered.
 */
export function KeyboardToolbar() {
  return (
    <Toolbar theme={toolbarTheme(TINTS[useResolvedTint()])}>
      <Toolbar.Prev />
      <Toolbar.Next />
    </Toolbar>
  );
}
