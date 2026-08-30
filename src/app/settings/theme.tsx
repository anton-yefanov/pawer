import { router } from 'expo-router';

import { PickerSheet } from '@/components/settings/picker-sheet';
import { THEME_PREFERENCES, useThemePreference } from '@/lib/theme-preference';
import { attempt } from '@/lib/observability';

export default function ThemeSettingsScreen() {
  const { preference, setPreference } = useThemePreference();

  return (
    <PickerSheet
      title="Dark Theme"
      options={THEME_PREFERENCES}
      selected={preference}
      onSelect={(id) => {
        void attempt('settings', setPreference(id), { title: 'Couldn’t save setting', message: 'Please try again.' });
        router.back();
      }}
    />
  );
}
