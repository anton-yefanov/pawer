import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import { stackScreenOptions } from "@/constants/navigation";
import { DETAIL_SHEET, FULL_SHEET } from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";
import { BlockLayoutProvider } from "@/lib/analytics-layout";

export default function AnalyticsLayout() {
  const theme = useTheme();

  return (
    <BlockLayoutProvider>
      <Stack
        screenOptions={stackScreenOptions(theme)}
        screenLayout={tabBarScreenLayout}
      >
        {/* The title is drawn in the screen so the add button can sit beside
            it, as on Home — iOS never puts a bar-button item inside an
            expanded large title's row. */}
        <Stack.Screen
          name="index"
          options={{ title: "Analytics", headerShown: false }}
        />
        <Stack.Screen
          name="add-block"
          options={{ ...FULL_SHEET, title: "Add Chart" }}
        />
        <Stack.Screen
          name="muscles"
          options={{ ...DETAIL_SHEET, title: "Muscles worked" }}
        />
        <Stack.Screen
          name="records"
          options={{ ...DETAIL_SHEET, title: "Personal records" }}
        />
      </Stack>
    </BlockLayoutProvider>
  );
}
