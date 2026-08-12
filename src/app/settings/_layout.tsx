import { Stack } from 'expo-router';

import { SHEET } from '@/constants/sheet';
import { useTheme } from '@/hooks/use-theme';

/** The pickers are short enough to sit in a drawer, so they carry their own title. */
const PICKER_SHEET = {
  ...SHEET,
  sheetAllowedDetents: 'fitToContents',
  headerShown: false,
} as const;

export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Settings', headerLargeTitle: true }} />
      <Stack.Screen name="theme" options={PICKER_SHEET} />
      <Stack.Screen name="weight-unit" options={PICKER_SHEET} />
      <Stack.Screen name="finish-reminder" options={PICKER_SHEET} />
    </Stack>
  );
}
