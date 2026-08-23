import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import { stackScreenOptions, TAB_ROOT_HEADER } from "@/constants/navigation";
import { SHEET } from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";

/** The pickers are short enough to sit in a drawer, so they carry their own title. */
const PICKER_SHEET = {
  ...SHEET,
  sheetAllowedDetents: "fitToContents",
  headerShown: false,
} as const;

export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{ title: "Settings", ...TAB_ROOT_HEADER }}
      />
      <Stack.Screen name="theme" options={PICKER_SHEET} />
      <Stack.Screen name="weight-unit" options={PICKER_SHEET} />
      <Stack.Screen name="finish-reminder" options={PICKER_SHEET} />
    </Stack>
  );
}
