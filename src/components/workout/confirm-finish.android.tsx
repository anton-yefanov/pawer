import { useEffect } from 'react';

import { Dialog } from '@/components/android/dialog';
import { t } from '@/i18n';
import * as haptics from '@/lib/haptics';

type Props = {
  open: boolean;
  onCompleteUnfinished: () => void;
  onCancelWorkout: () => void;
  onDismiss: () => void;
};

export function ConfirmFinish({ open, onCompleteUnfinished, onCancelWorkout, onDismiss }: Props) {
  useEffect(() => {
    if (open) haptics.warn();
  }, [open]);

  return (
    <Dialog
      open={open}
      title={t('workout:finish.title')}
      message={t('workout:finish.unfinished')}
      onDismiss={onDismiss}
      actions={[
        { label: t('workout:finish.completeUnfinished'), onPress: onCompleteUnfinished },
        { label: t('workout:finish.cancelWorkout'), role: 'destructive', onPress: onCancelWorkout },
        { label: t('common:action.cancel'), role: 'cancel', onPress: onDismiss },
      ]}
    />
  );
}
