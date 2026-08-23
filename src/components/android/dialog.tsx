import { Fragment } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DialogAction = {
  label: string;
  role?: 'default' | 'destructive' | 'cancel';
  onPress: () => void;
};

/**
 * The Android stand-in for the SwiftUI `.alert`s raised from inside a sheet.
 *
 * Compose's `AlertDialog` only has a confirm and a dismiss slot, and the finish
 * confirm carries three actions, so both are drawn here instead — one control
 * rather than two confirms that look nothing alike.
 *
 * Actions are full-width rows split by hairlines rather than Material's row of
 * right-aligned text buttons: it is the same shape as the app's grouped lists,
 * and these labels are full sentences that would not fit on one line anyway.
 */
export function Dialog({
  open,
  title,
  message,
  actions,
  onDismiss,
}: {
  open: boolean;
  title: string;
  message?: string;
  actions: readonly DialogAction[];
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onDismiss}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onDismiss} />

      <View style={styles.centre} pointerEvents="box-none">
        <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
          <View style={styles.content}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            {message != null && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
          </View>

          {actions.map((action) => (
            <Fragment key={action.label}>
              <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
              <Pressable
                accessibilityRole="button"
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  pressed && { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText
                  type="smallBold"
                  themeColor={
                    action.role === 'destructive'
                      ? 'danger'
                      : action.role === 'cancel'
                        ? 'textSecondary'
                        : 'accent'
                  }>
                  {action.label}
                </ThemedText>
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>
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
  // Clipped so a pressed action's fill stops at the corner radius.
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 600,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
