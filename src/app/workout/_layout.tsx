import { Stack } from 'expo-router';

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

  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: 20,
    headerLargeTitle: false,
  } as const;

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
      <Stack.Screen name="active" options={{ ...sheet, sheetAllowedDetents: [1], title: '' }} />
      {/*
        Both pickers render their own floating search row over the nav bar, so a
        title there would sit on top of it. `headerShown: false` from inside the
        screen doesn't take once the native header exists — the title has to be
        empty here.
      */}
      <Stack.Screen
        name="add-exercise"
        options={{ ...sheet, sheetAllowedDetents: [1], title: '' }}
      />
      <Stack.Screen
        name="timer"
        options={{ ...sheet, sheetAllowedDetents: [0.4], title: 'Timer' }}
      />
      <Stack.Screen
        name="exercise/[id]"
        options={{ ...sheet, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
      <Stack.Screen
        name="template/new"
        options={{ ...sheet, sheetAllowedDetents: [1], title: 'New Template' }}
      />
      <Stack.Screen
        name="template/edit"
        options={{ ...sheet, sheetAllowedDetents: [1], title: 'Edit Template' }}
      />
      <Stack.Screen
        name="template/add-exercises"
        options={{ ...sheet, sheetAllowedDetents: [1], title: '' }}
      />
      <Stack.Screen
        name="template/[id]"
        options={{ ...sheet, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
      <Stack.Screen
        name="folder/[id]"
        options={{ ...sheet, sheetAllowedDetents: [0.6, 1], sheetInitialDetentIndex: 0 }}
      />
    </Stack>
  );
}
