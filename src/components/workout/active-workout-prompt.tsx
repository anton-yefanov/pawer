import { ConfirmAlert } from '@/components/workout/confirm-alert';
import { t } from '@/i18n';

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
      title={t('workout:inProgress.title')}
      message={t('workout:inProgress.message')}
      confirmLabel={t('workout:inProgress.open')}
      confirmRole="default"
      dismissLabel={t('common:action.notNow')}
      onConfirm={onResume}
      onDismiss={onDismiss}
    />
  );
}
