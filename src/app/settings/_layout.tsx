import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import { stackScreenOptions, surfacePageOptions } from "@/constants/navigation";
import { FULL_SHEET, SHEET } from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/i18n";

export default function SettingsLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{ title: t("settings:title"), headerShown: false }}
      />
      <Stack.Screen name="support" options={FULL_SHEET} />
      <Stack.Screen name="import" options={FULL_SHEET} />
      <Stack.Screen
        name="import-exercise"
        options={{ ...FULL_SHEET, headerShown: false, ...surfacePageOptions(theme) }}
      />
      <Stack.Screen name="new-exercise" options={FULL_SHEET} />
      <Stack.Screen
        name="info"
        options={{ ...SHEET, sheetAllowedDetents: "fitToContents", headerShown: false }}
      />
    </Stack>
  );
}
