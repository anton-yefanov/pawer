import { Stack } from 'expo-router';

import { FULL_SHEET, SHEET } from '@/constants/sheet';
import { useTheme } from '@/hooks/use-theme';

/**
 * The workout sheets are duplicated here rather than pushed at `/workout/*`:
 * those belong to the Workout tab's stack, and pushing one from History would
 * switch tabs mid-gesture. Same sibling-sheet rules as workout/_layout.tsx.
 */
export default function HistoryLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
      }}>
      <Stack.Screen name="index" options={{ title: 'History', headerLargeTitle: true }} />
      <Stack.Screen
        name="workout-details"
        options={{ ...SHEET, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
      <Stack.Screen name="workout-edit" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen name="workout-active" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen name="workout-add-exercise" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen
        name="workout-timer"
        options={{ ...SHEET, sheetAllowedDetents: [0.4], title: 'Timer' }}
      />
      <Stack.Screen
        name="workout-exercise"
        options={{ ...SHEET, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
    </Stack>
  );
}
