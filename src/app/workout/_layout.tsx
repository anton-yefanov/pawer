import { Stack } from 'expo-router';

import { FULL_SHEET, SHEET } from '@/constants/sheet';
import { useTheme } from '@/hooks/use-theme';

/**
 * Sheets are siblings in this Stack, not nested stacks. react-native-screens
 * presents each modal from the previously presented one, so pushing
 * `add-exercise` while `active` is up gives a real sheet-on-sheet and `back()`
 * dismisses exactly one level. Two rules that come with it: never `replace`
 * between two modal routes, and never dismiss and present in the same tick —
 * both make RNSScreenStack bail out.
 */
export default function WorkoutLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={{ headerShown: true, headerTintColor: theme.text }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Start Workout',
          headerLargeTitle: true,
          contentStyle: { backgroundColor: theme.background },
        }}
      />
      <Stack.Screen name="active" options={{ ...FULL_SHEET, title: '' }} />
      {/*
        Both pickers render their own floating search row over the nav bar, so a
        title there would sit on top of it. `headerShown: false` from inside the
        screen doesn't take once the native header exists — the title has to be
        empty here.
      */}
      <Stack.Screen name="add-exercise" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen
        name="timer"
        options={{ ...SHEET, sheetAllowedDetents: [0.4], title: 'Timer' }}
      />
      <Stack.Screen
        name="exercise/[id]"
        options={{ ...SHEET, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
      <Stack.Screen name="template/new" options={{ ...FULL_SHEET, title: 'New Template' }} />
      <Stack.Screen name="template/edit" options={{ ...FULL_SHEET, title: 'Edit Template' }} />
      <Stack.Screen name="template/add-exercises" options={{ ...FULL_SHEET, title: '' }} />
      <Stack.Screen
        name="template/[id]"
        options={{ ...SHEET, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
      <Stack.Screen
        name="folder/[id]"
        options={{ ...SHEET, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
    </Stack>
  );
}
