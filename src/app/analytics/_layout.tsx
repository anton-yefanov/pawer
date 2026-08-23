import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import { stackScreenOptions, TAB_ROOT_HEADER } from "@/constants/navigation";
import { useTheme } from "@/hooks/use-theme";

export default function AnalyticsLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{ title: "Analytics", ...TAB_ROOT_HEADER }}
      />
    </Stack>
  );
}
