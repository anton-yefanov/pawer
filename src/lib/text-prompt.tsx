import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';

export type PromptOptions = {
  title: string;
  confirmLabel: string;
  initialValue?: string;
};

type Pending = PromptOptions & { resolve: (value: string) => void };

let present: ((options: PromptOptions) => Promise<string>) | null = null;

/**
 * A one-field dialog, resolving to the trimmed text or `''` if it was dismissed.
 *
 * Plain function rather than a hook for the same reason `haptics` is: the menu
 * action factories that raise these run outside React. iOS has
 * `Alert.prompt` for exactly this and keeps using it (`text-prompt.ios.tsx`);
 * every other platform needs the dialog drawn, so a host mounted at the root
 * registers itself here and the call reaches it through the module.
 */
export function prompt(options: PromptOptions): Promise<string> {
  return present?.(options) ?? Promise.resolve('');
}

/** Mounted once, at the root — see `src/app/_layout.tsx`. */
export function PromptHost() {
  const theme = useTheme();
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState('');
  const field = useRef<TextInput>(null);

  useEffect(() => {
    present = (options) =>
      new Promise<string>((resolve) => {
        setValue(options.initialValue ?? '');
        setPending({ ...options, resolve });
      });
    return () => {
      present = null;
    };
  }, []);

  if (pending == null) return null;

  const settle = (result: string) => {
    setPending(null);
    pending.resolve(result);
  };

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={() => settle('')}
      /* A Modal is its own window: on Android it takes focus after the mount
         that `autoFocus` fires on, so the field ends up focused in a window
         that isn't, with no keyboard. Focusing once the window is up is what
         raises the IME. */
      onShow={() => requestAnimationFrame(() => field.current?.focus())}>
      <Pressable
        style={[styles.scrim, { backgroundColor: theme.scrim }]}
        onPress={() => settle('')}
      />

      {/* A Modal is its own window, and RN makes that window edge-to-edge for
          the translucent bars above — which is exactly the case where Android
          stops honouring `adjustResize`, so the dialog would sit centred with
          the keyboard over its lower half. Padding it by the IME inset re-centres
          it in what's left. */}
      <KeyboardAvoidingView behavior="padding" style={styles.centre} pointerEvents="box-none">
        <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
          <ThemedText type="smallBold">{pending.title}</ThemedText>

          <ThemedTextInput
            ref={field}
            autoFocus
            selectTextOnFocus
            value={value}
            onChangeText={setValue}
            onSubmitEditing={() => settle(value)}
            returnKeyType="done"
            style={[
              styles.field,
              { backgroundColor: theme.backgroundElement },
            ]}
          />

          <View style={styles.actions}>
            <Pressable onPress={() => settle('')} style={styles.action}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => settle(value)} style={styles.action}>
              <ThemedText type="smallBold" themeColor="accent">
                {pending.confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
});
