import { Dialog, DialogButton } from '@/components/workout/dialog';
import { useTheme } from '@/hooks/use-theme';

/** Shown when a start action is refused because a session is already running. */
export function ActiveWorkoutPrompt({
  onResume,
  onDismiss,
}: {
  onResume: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <Dialog
      emoji="🏋️"
      title="Workout in Progress"
      body="You already have a workout going. Finish or cancel it before starting another."
      onDismiss={onDismiss}>
      <DialogButton
        label="Open Workout"
        background={theme.accent}
        color={theme.accentContent}
        onPress={onResume}
      />
      <DialogButton
        label="Not Now"
        background={theme.backgroundElement}
        color={theme.text}
        onPress={onDismiss}
      />
    </Dialog>
  );
}
