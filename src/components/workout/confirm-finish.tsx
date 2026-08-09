import { Dialog, DialogButton } from '@/components/workout/dialog';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  onCompleteUnfinished: () => void;
  onCancelWorkout: () => void;
  onDismiss: () => void;
};

export function ConfirmFinish({ onCompleteUnfinished, onCancelWorkout, onDismiss }: Props) {
  const theme = useTheme();

  return (
    <Dialog
      emoji="🎉"
      title="Finish Workout?"
      body="There are valid sets in this workout that have not been marked as complete."
      onDismiss={onDismiss}>
      <DialogButton
        label="Complete Unfinished Sets"
        background={theme.success}
        color={theme.accentContent}
        onPress={onCompleteUnfinished}
      />
      <DialogButton
        label="Cancel Workout"
        background={theme.dangerMuted}
        color={theme.danger}
        onPress={onCancelWorkout}
      />
      <DialogButton
        label="Cancel"
        background={theme.backgroundElement}
        color={theme.text}
        onPress={onDismiss}
      />
    </Dialog>
  );
}
