import { ConfirmAlert } from '@/components/workout/confirm-alert';

/** Shown when a start action is refused because a session is already running. */
export function ActiveWorkoutPrompt({
  open,
  onResume,
  onDismiss,
}: {
  open: boolean;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <ConfirmAlert
      open={open}
      title="Workout in Progress"
      message="You already have a workout going. Finish or cancel it before starting another."
      confirmLabel="Open Workout"
      confirmRole="default"
      dismissLabel="Not Now"
      onConfirm={onResume}
      onDismiss={onDismiss}
    />
  );
}
