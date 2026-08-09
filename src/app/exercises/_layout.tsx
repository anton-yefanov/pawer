import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function ExercisesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
      }}>
      <Stack.Screen name="index" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.6, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 20,
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}
