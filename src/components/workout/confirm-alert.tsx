import { Alert, Button, Host, Spacer, Text } from '@expo/ui/swift-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import * as haptics from '@/lib/haptics';

/**
 * A real system alert raised from inside a formSheet. `Alert.alert` presents from
 * the view controller behind the sheet and never reaches the screen (see
 * dialog.tsx), but SwiftUI's `.alert` attaches to a view inside the sheet itself,
 * so it comes up centred over everything.
 *
 * The host is zero-sized on purpose: only the alert is ever visible, and a host
 * with area would sit in the layout and swallow touches.
 */
export function ConfirmAlert({
  open,
  title,
  message,
  confirmLabel,
  confirmRole = 'destructive',
  dismissLabel = 'Cancel',
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  confirmRole?: 'default' | 'destructive';
  dismissLabel?: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  // The alert is presented declaratively, so its arrival is the only thing to
  // hook — there is no press to hang the buzz off.
  useEffect(() => {
    if (!open) return;
    if (confirmRole === 'destructive') haptics.warn();
    else haptics.tap();
  }, [open, confirmRole]);

  return (
    <Host style={styles.host}>
      <Alert
        title={title}
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}>
        <Alert.Trigger>
          <Spacer />
        </Alert.Trigger>
        <Alert.Actions>
          <Button role={confirmRole} label={confirmLabel} onPress={onConfirm} />
          <Button role="cancel" label={dismissLabel} onPress={onDismiss} />
        </Alert.Actions>
        {message != null && (
          <Alert.Message>
            <Text>{message}</Text>
          </Alert.Message>
        )}
      </Alert>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: 0,
    height: 0,
  },
});
