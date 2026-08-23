import { useEffect } from 'react';

import { Dialog } from '@/components/android/dialog';
import * as haptics from '@/lib/haptics';

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
  // Presented declaratively, so its arrival is the only thing to hook — there
  // is no press to hang the buzz off.
  useEffect(() => {
    if (!open) return;
    if (confirmRole === 'destructive') haptics.warn();
    else haptics.tap();
  }, [open, confirmRole]);

  return (
    <Dialog
      open={open}
      title={title}
      message={message}
      onDismiss={onDismiss}
      actions={[
        { label: dismissLabel, role: 'cancel', onPress: onDismiss },
        { label: confirmLabel, role: confirmRole, onPress: onConfirm },
      ]}
    />
  );
}
