import { router } from 'expo-router';

import { PickerSheet } from '@/components/settings/picker-sheet';
import { THEME_PREFERENCES, useThemePreference } from '@/lib/theme-preference';

export default function ThemeSettingsScreen() {
  const { preference, setPreference } = useThemePreference();

  return (
    <PickerSheet
      title="Dark Theme"
      options={THEME_PREFERENCES}
      selected={preference}
      onSelect={(id) => {
        void setPreference(id);
        router.back();
      }}
    />
  );
}
