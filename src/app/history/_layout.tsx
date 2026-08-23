import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import {
  stackScreenOptions,
  surfacePageOptions,
  TAB_ROOT_HEADER,
} from "@/constants/navigation";
import { DETAIL_SHEET, FULL_SHEET } from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";

/**
 * The workout sheets are duplicated here rather than pushed at the Workout
 * tab's paths: those belong to that tab's stack, and pushing one from History
 * would switch tabs mid-gesture. Same sibling-sheet rules as (workout)/_layout.
 */
export default function HistoryLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{ title: "History", ...TAB_ROOT_HEADER }}
      />
      <Stack.Screen
        name="workout-details"
        options={DETAIL_SHEET}
      />
      <Stack.Screen
        name="workout-edit"
        options={{ ...FULL_SHEET, title: "" }}
      />
      <Stack.Screen
        name="workout-active"
        options={{ ...FULL_SHEET, title: "" }}
      />
      <Stack.Screen
        name="workout-add-exercise"
        options={{
          ...FULL_SHEET,
          title: "",
          ...surfacePageOptions(theme),
        }}
      />
      <Stack.Screen name="new-exercise" options={FULL_SHEET} />
      <Stack.Screen name="workout-exercise-edit" options={FULL_SHEET} />
      <Stack.Screen
        name="workout-exercise"
        options={DETAIL_SHEET}
      />
    </Stack>
  );
}
