import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import {
  stackScreenOptions,
  surfacePageOptions,
  TAB_ROOT_HEADER,
} from "@/constants/navigation";
import {
  DETAIL_SHEET,
  FULL_SHEET,
  PINNED_CORNER_RADIUS,
  SHEET,
} from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";

/**
 * Sheets are siblings in this Stack, not nested stacks. react-native-screens
 * presents each modal from the previously presented one, so pushing
 * `add-exercise` while `active` is up gives a real sheet-on-sheet and `back()`
 * dismisses exactly one level. Two rules that come with it: never `replace`
 * between two modal routes, and never dismiss and present in the same tick —
 * both make RNSScreenStack bail out. The sibling arrangement is also what
 * keeps this working on Android, where a `formSheet` is a Material bottom sheet
 * that cannot host a nested stack at all. There the sheet's grabber is content
 * rather than chrome, so a new sheet renders either `SheetHeader`, which draws
 * one, or `SheetGrabber` itself.
 */
export default function WorkoutLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{ title: "Home", ...TAB_ROOT_HEADER }}
      />
      <Stack.Screen name="active" options={{ ...FULL_SHEET, title: "" }} />
      <Stack.Screen name="muscle-recovery" options={DETAIL_SHEET} />
      {/*
        Both pickers render their own floating search row, so they want no nav
        bar at all. It has to be turned off here: `headerShown: false` from
        inside the screen doesn't take once the native header exists, and an
        empty-titled header still insets the list under it by its own height.
      */}
      <Stack.Screen
        name="add-exercise"
        options={{
          ...FULL_SHEET,
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
      <Stack.Screen name="new-exercise" options={FULL_SHEET} />
      <Stack.Screen name="exercise/edit" options={FULL_SHEET} />
      <Stack.Screen
        name="exercise/[id]"
        options={DETAIL_SHEET}
      />
      <Stack.Screen
        name="template/new"
        options={{ ...FULL_SHEET, title: "New Template" }}
      />
      <Stack.Screen
        name="template/edit"
        options={{ ...FULL_SHEET, title: "Edit Template" }}
      />
      <Stack.Screen
        name="template/add-exercises"
        options={{
          ...FULL_SHEET,
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
      {/* Explicit radius, so the sheet stays pinned to the edges instead of
          taking iOS 26's floating inset appearance below full height. The
          floating sheet is composited offscreen (mask + shadow), and a
          UIVisualEffectView inside one can't sample a backdrop — every glass
          control in the sheet falls back to a flat fill until the full detent.
          The constant is platform-split, so Android keeps its shared radius. */}
      <Stack.Screen
        name="template/[id]"
        options={{
          ...DETAIL_SHEET,
          sheetCornerRadius: PINNED_CORNER_RADIUS,
        }}
      />
      <Stack.Screen
        name="folder/[id]"
        options={DETAIL_SHEET}
      />
      {/* Same picker presentation as the Settings sheets: the swatch grid draws
          its own title, so the nav bar would only add empty height. */}
      <Stack.Screen
        name="customize"
        options={{
          ...SHEET,
          sheetAllowedDetents: "fitToContents",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
