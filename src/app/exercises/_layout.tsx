import { Stack } from 'expo-router';

import { FULL_SHEET, SHEET } from '@/constants/sheet';
import { useTheme } from '@/hooks/use-theme';

export default function ExercisesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerTransparent: true,
          contentStyle: { backgroundColor: theme.surface },
        }}
      />
      {/* Title and header buttons change per step, so the screen sets them. */}
      <Stack.Screen name="new" options={FULL_SHEET} />
      <Stack.Screen name="edit" options={FULL_SHEET} />
      <Stack.Screen
        name="[id]"
        options={{
          ...SHEET,
          sheetAllowedDetents: [0.6, 1],
          sheetInitialDetentIndex: 0,
        }}
      />
    </Stack>
  );
}
