import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function HistoryLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
      }}>
      <Stack.Screen name="index" options={{ title: 'History', headerLargeTitle: true }} />
    </Stack>
  );
}
