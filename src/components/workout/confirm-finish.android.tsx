import { useEffect } from 'react';

import { Dialog } from '@/components/android/dialog';
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
      title="Finish Workout?"
      message="There are valid sets in this workout that have not been marked as complete."
      onDismiss={onDismiss}
      actions={[
        { label: 'Complete Unfinished Sets', onPress: onCompleteUnfinished },
        { label: 'Cancel Workout', role: 'destructive', onPress: onCancelWorkout },
        { label: 'Cancel', role: 'cancel', onPress: onDismiss },
      ]}
    />
  );
}
