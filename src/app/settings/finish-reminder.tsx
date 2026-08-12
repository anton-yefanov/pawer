import { router } from 'expo-router';

import { PickerSheet } from '@/components/settings/picker-sheet';
import { FINISH_REMINDER_OPTIONS, useFinishReminder } from '@/lib/finish-reminder';
import { ensureNotificationPermission } from '@/lib/notifications';

export default function FinishReminderSettingsScreen() {
  const { option, setOption } = useFinishReminder();

  return (
    <PickerSheet
      title="Remind me after being inactive for"
      footer="The finish reminder helps you remember to mark your workout as finished when done working out."
      options={FINISH_REMINDER_OPTIONS}
      selected={option}
      onSelect={(id) => {
        void setOption(id);
        // Asked here rather than at launch: this is the moment the user has
        // said they want the notification.
        if (id !== 'never') void ensureNotificationPermission();
        router.back();
      }}
    />
  );
}
