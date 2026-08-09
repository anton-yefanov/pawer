import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AnalyticsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
      }}>
      <Stack.Screen name="index" options={{ title: 'Analytics', headerLargeTitle: true }} />
    </Stack>
  );
}
