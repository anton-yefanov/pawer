import { Stack } from 'expo-router';

import { FULL_SHEET, SHEET } from '@/constants/sheet';
import { useTheme } from '@/hooks/use-theme';

/**
 * The workout sheets are duplicated here rather than pushed at the Workout
 * tab's paths: those belong to that tab's stack, and pushing one from History
 * would switch tabs mid-gesture. Same sibling-sheet rules as (workout)/_layout.
 */
export default function HistoryLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'History', headerLargeTitle: true }} />
      <Stack.Screen
        name="workout-details"
        options={{
          ...SHEET,
          sheetAllowedDetents: [0.6, 1],
          sheetInitialDetentIndex: 0,
        }}
      />
      <Stack.Screen name="workout-edit" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen name="workout-active" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen
        name="workout-add-exercise"
        options={{
          ...FULL_SHEET,
          title: '',
          contentStyle: { backgroundColor: theme.surface },
        }}
      />
      <Stack.Screen name="new-exercise" options={FULL_SHEET} />
      <Stack.Screen name="workout-exercise-edit" options={FULL_SHEET} />
      <Stack.Screen
        name="workout-exercise"
        options={{
          ...SHEET,
          sheetAllowedDetents: [0.6, 1],
          sheetInitialDetentIndex: 0,
        }}
      />
    </Stack>
  );
}
