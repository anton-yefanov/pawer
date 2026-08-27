import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import { stackScreenOptions, surfacePageOptions } from "@/constants/navigation";
import { DETAIL_SHEET, FULL_SHEET } from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";

export default function ExercisesLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: "",
          headerTransparent: true,
          ...surfacePageOptions(theme),
        }}
      />
      {/* Title and header buttons change per step, so the screen sets them. */}
      <Stack.Screen name="new" options={FULL_SHEET} />
      <Stack.Screen name="edit" options={FULL_SHEET} />
      {/* The exercise name and its buttons live in the content, under the
          images — an empty nav bar would only be a band of white above them,
          and turning it off from inside the screen never takes. */}
      <Stack.Screen
        name="[id]"
        options={{
          ...DETAIL_SHEET,
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
    </Stack>
  );
}
